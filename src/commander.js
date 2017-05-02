FarmOverflowCommander = (function () {
    let $root = angular.element(document).scope()
    let $route = injector.get('routeProvider')
    let $eventType = injector.get('eventTypeProvider')
    let $socket = injector.get('socketService')
    let $armyService = injector.get('armyService')
    let $math = require('helper/math')

    /**
     * Gera um número aleatório aproximado da base.
     *
     * @param {Number} base - Número base para o calculo.
     */
    function randomSeconds (base) {
        base = parseInt(base, 10)
        
        let max = base + (base / 2)
        let min = base - (base / 2)

        return Math.round(Math.random() * (max - min) + min)
    }

    /**
     * Converte uma string com um tempo em segundos.
     *
     * @param {String} time - Tempo que será convertido (hh:mm:ss)
     */
    function time2seconds (time) {
        time = time.split(':')
        time[0] = parseInt(time[0], 10) * 60 * 60
        time[1] = parseInt(time[1], 10) * 60
        time[2] = parseInt(time[2], 10)

        return time.reduce((a, b) => {
            return a + b
        })
    }

    /**
     * @class
     *
     * Controla os ciclos de comandos, enviando ataques, alternando
     * aldeias e alvos.
     *
     * @param {FarmOverflow} farmOverflow - Classe referência do farmOverflow
     *      com as depêndencias.
     */
    function Commander (farmOverflow) {
        /**
         * Copia da estrutura do farmOverflow.
         *
         * @type {Object}
         */
        this.farmOverflow = farmOverflow

        /**
         * Armazena o antecipadamente o próximo evento (noUnits/commandLimit)
         * evitando o script de fazer ações com os dados locais (tropas/comandos)
         * que ainda não foram atualizados pelo código nativo do jogo.
         *
         * @type {String|Boolean}
         */
        this.preventNextCommand = false


        this.timeoutId = null
        this.running = false
    }

    Commander.prototype.start = function () {
        this.farmOverflow.event('start')
        this.running = true
        this.analyse()
    }

    Commander.prototype.stop = function () {
        this.farmOverflow.event('pause')
        this.running = false
        clearTimeout(this.timeoutId)
    }

    Commander.prototype.analyse = function () {
        let self = this.farmOverflow

        if (!this.running) {
            return false
        }

        if (!self.hasVillage()) {
            return self.event('noVillageSelected')
        }

        if (!self.village.loaded()) {
            self.village.load(() => {
                self.analyse()
            })

            return false
        }

        if (self.isWaiting() || self.isIgnored()) {
            if (self.nextVillage()) {
                this.analyse()
            } else {
                self.event(self.lastError)
            }

            return false
        }

        // Se aldeia ainda não tiver obtido a lista de alvos, obtem
        // os alvos e executa o comando novamente para dar continuidade.
        if (!self.targetsLoaded()) {
            self.getTargets(() => {
                this.analyse()
            })

            return false
        }

        // Analisa se a aldeia selecionada possui algum alvo disponível
        // e o selecionada. Caso não tenha uma nova aldeia será selecionada.
        if (self.hasTarget()) {
            self.selectTarget()
        } else {
            if (self.nextVillage()) {
                this.analyse()
            } else {
                self.event('noTargets')
            }

            return false
        }

        self.checkPresets(() => {
            if (self.village.countCommands() >= 48) {
                return this.handleError('commandLimit')
            }

            let preset = this.getPreset()

            if (preset.error) {
                return this.handleError(preset.error)
            }

            this.getPresetNext(preset)
            this.send(preset)
        })
    }

    /**
     * Lida com as exceções no ciclo de comandos como "noUnits",
     * "commandLimit" e "timeLimit"
     *
     * @param {String} error - Erro a ser processado.
     */
    Commander.prototype.handleError = function (error) {
        error = error || this.preventNextCommand

        let self = this.farmOverflow

        this.preventNextCommand = false
        self.lastError = error

        let sid = self.village.id

        switch (error) {
        case 'timeLimit':
            self.nextTarget()
            this.analyse()

            break
        case 'noUnits':
            self.event('noUnits', [
                self.village
            ])
            
            self.waiting[sid] = true
            
            if (self.singleVillage) {
                if (self.village.countCommands() === 0) {
                    return self.event('noUnitsNoCommands')
                } else {
                    self.globalWaiting = true
                }
            } else {
                if (self.nextVillage()) {
                    this.analyse()
                } else {
                    self.globalWaiting = true
                }
            }

            break
        case 'commandLimit':
            self.waiting[sid] = true

            if (self.singleVillage) {
                self.globalWaiting = true

                self.event('commandLimitSingle', [
                    self.village
                ])
            } else {
                if (self.isAllWaiting()) {
                    self.event('commandLimitMulti', [
                        self.village
                    ])

                    self.globalWaiting = true

                    return false
                }

                self.nextVillage()
                this.analyse()
            }

            break
        }
    }

    /**
     * Obtem o preset que houver tropas sulficientes e que o tempo do
     * comando não seja maior do que o configurado.
     *
     * @param {Object} [_units] Analisa as unidades passadas ao invés das
     * unidades atuais da aldeia.
     *
     * @return {Object} preset ou erro.
     */
    Commander.prototype.getPreset = function (_units) {
        log('getPreset')

        let self = this.farmOverflow

        let timeLimit = false
        let units = _units || self.village.units

        for (let preset of self.presets) {
            let avail = true

            for (let unit in preset.units) {
                if (units[unit].in_town < preset.units[unit]) {
                    avail = false
                }
            }

            if (avail) {
                if (this.checkPresetTime(preset)) {
                    return preset
                } else {
                    timeLimit = true

                    continue
                }
            }
        }

        return {
            error: timeLimit ? 'timeLimit' : 'noUnits'
        }
    }

    /**
     * Verifica a condição das tropas na aldeia do proximo comando.
     *
     * @param {Object} presetUsed - Preset usado no comando usado para simular
     * a redução de tropas para o proximo comando.
     */
    Commander.prototype.getPresetNext = function (presetUsed) {
        log('getPresetNext')

        let self = this.farmOverflow

        let unitsCopy = angular.copy(self.village.units)
        let unitsUsed = presetUsed.units

        for (let unit in unitsUsed) {
            unitsCopy[unit].in_town -= unitsUsed[unit]
        }

        let result = this.getPreset(unitsCopy)

        if (result.error) {
            this.preventNextCommand = result.error
        }
    }

    /**
     * Verifica se o tempo de viagem do preset, da aldeia de origem até
     * a aldeia alvo não ultrapassa o tempo máximo.
     *
     * @param {Object} preset - Preset usado no calculo.
     */
    Commander.prototype.checkPresetTime = function (preset) {
        log('checkPresetTime')

        let self = this.farmOverflow

        let travelTime = $armyService.calculateTravelTime(preset, {
            barbarian: !self.village.pid,
            officers: false
        })

        let villagePosition = self.village.position
        let targetPosition = {
            x: self.target.x,
            y: self.target.y
        }

        let distance = $math.actualDistance(villagePosition, targetPosition)

        let totalTravelTime = $armyService.getTravelTimeForDistance(
            preset,
            travelTime,
            distance,
            'attack'
        )

        let limitTime = time2seconds(self.settings.maxTravelTime)

        return limitTime > totalTravelTime
    }

    /**
     * Emite o envio do comando para o servidor.

     * @param {Object} preset - Preset a ser enviado
     * @param {Function} callback - Chamado após a confirmação de
     * alteração das tropas na aldeia.
     */
    Commander.prototype.send = function (preset, callback) {
        log('send')

        if (!this.running) {
            return false
        }

        let self = this.farmOverflow
        let unbindError
        let unbindSend

        this.simulate()

        // Por algum motivo a lista de comandos de algumas aldeias
        // não ficam sincronizadas com os comandos registrados no servidor
        // então atualizamos por nossa própria conta o objeto com os
        // comandos e reiniciamos os ataques.
        unbindError = this.onCommandError(() => {
            unbindSend()

            self.village.updateCommands(() => {
                this.analyse()
            })
        })

        unbindSend = this.onCommandSend(() => {
            unbindError()
            self.nextTarget()

            let interval
            
            // Intervalo mínimo de 1 segundo para que o jogo registre as
            // alterações das unidades no objeto local da aldeia.
            interval = randomSeconds(self.settings.randomBase)
            interval = 1000 + (interval * 1000)

            this.timeoutId = setTimeout(() => {
                if (this.preventNextCommand) {
                    return this.handleError()
                }

                this.analyse()
            }, interval)

            self.updateActivity()
        })

        $socket.emit($route.SEND_PRESET, {
            start_village: self.village.id,
            target_village: self.target.id,
            army_preset_id: preset.id,
            type: 'attack'
        })

        return true
    }

    /**
     * Chamado após a confirmação de alteração das tropas na aldeia.
     */
    Commander.prototype.onCommandSend = function (callback) {
        let self =  this.farmOverflow
        let before = angular.copy(self.village.units)
        
        let unbind = $root.$on($eventType.VILLAGE_UNIT_INFO, (event, data) => {
            if (self.village.id !== data.village_id) {
                return false
            }

            let now = self.village.units
            let equals = angular.equals(before, now)

            if (equals) {
                return false
            }

            self.event('sendCommand', [
                self.village,
                self.target
            ])

            Analytics.attack()

            unbind()
            callback()
        })

        return unbind
    }

     /**
     * Chamado após a ocorrer um erro ao tentar enviar um comando.
     */
    Commander.prototype.onCommandError = function (callback) {
        let self =  this.farmOverflow

        let unbind = $root.$on($eventType.MESSAGE_ERROR, (event, data) => {
            if (!data.cause || !data.code) {
                return false
            }

            if (data.cause !== 'Command/sendPreset') {
                return false
            }

            if (data.code !== 'Command/attackLimitExceeded') {
                return false
            }

            Analytics.attackError()

            unbind()
            callback()
        })

        return unbind
    }

    /**
     * Simula algumas requisições feita pelo jogo quando é enviado
     * comandos manualmente.
     *
     * @param {Object} callback
     */
    Commander.prototype.simulate = function (callback) {
        log('simulate')

        let self = this.farmOverflow

        let attackingFactor = () => {
            $socket.emit($route.GET_ATTACKING_FACTOR, {
                target_id: self.target.id
            })
        }

        attackingFactor()

        if (callback) {
            callback()
        }
    }

    return Commander
})()
