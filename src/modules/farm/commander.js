define('FarmOverflow/Farm/Commander', [
    'helper/math'
], function ($math) {
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
        this.farmOverflow.trigger('start')
        this.running = true
        this.analyse()
    }

    Commander.prototype.stop = function () {
        this.farmOverflow.trigger('pause')
        this.running = false
        clearTimeout(this.timeoutId)
    }

    Commander.prototype.analyse = function () {
        var self = this
        var farm = self.farmOverflow

        if (!self.running) {
            return
        }

        if (!farm.presets.length) {
            farm.stop()
            farm.trigger('noPreset')

            return
        }

        if (!farm.hasVillage()) {
            return farm.trigger('noVillageSelected')
        }

        if (!farm.village.loaded()) {
            farm.village.load(function () {
                farm.analyse()
            })

            return
        }

        if (farm.isWaiting() || farm.isIgnored()) {
            if (farm.nextVillage()) {
                self.analyse()
            } else {
                farm.trigger(farm.lastError)
            }

            return
        }

        // Se aldeia ainda não tiver obtido a lista de alvos, obtem
        // os alvos e executa o comando novamente para dar continuidade.
        if (!farm.targetsLoaded()) {
            return farm.getTargets(function () {
                self.analyse()
            })
        }

        // Analisa se a aldeia selecionada possui algum alvo disponível
        // e o selecionada. Caso não tenha uma nova aldeia será selecionada.
        if (farm.hasTarget()) {
            farm.selectTarget()
        } else {
            if (farm.nextVillage()) {
                self.analyse()
            } else {
                farm.trigger('noTargets')
            }

            return
        }

        farm.checkPresets(function () {
            if (farm.village.countCommands() >= 48) {
                return self.handleError('commandLimit')
            }

            var preset = self.getPreset()

            if (preset.error) {
                return self.handleError(preset.error)
            }

            self.getPresetNext(preset)
            self.send(preset)
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

        var farm = this.farmOverflow

        this.preventNextCommand = false
        farm.lastError = error

        var sid = farm.village.id

        switch (error) {
        case 'timeLimit':
            farm.nextTarget()
            this.analyse()

            break
        case 'noUnits':
            farm.trigger('noUnits', [
                farm.village
            ])
            
            farm.waiting[sid] = true
            
            if (farm.singleVillage) {
                if (farm.village.countCommands() === 0) {
                    return farm.trigger('noUnitsNoCommands')
                } else {
                    farm.globalWaiting = true
                }
            } else {
                if (farm.nextVillage()) {
                    this.analyse()
                } else {
                    farm.globalWaiting = true
                }
            }

            break
        case 'commandLimit':
            farm.waiting[sid] = true

            if (farm.singleVillage) {
                farm.globalWaiting = true

                farm.trigger('commandLimitSingle', [
                    farm.village
                ])
            } else {
                if (farm.isAllWaiting()) {
                    farm.trigger('commandLimitMulti', [
                        farm.village
                    ])

                    farm.globalWaiting = true

                    return false
                }

                farm.nextVillage()
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
        var self = this
        var farm = self.farmOverflow

        var timeLimit = false
        var units = _units || farm.village.units

        for (var i = 0; i < farm.presets.length; i++) {
            var preset = farm.presets[i]
            var avail = true

            for (var unit in preset.units) {
                if (units[unit].in_town < preset.units[unit]) {
                    avail = false
                }
            }

            if (avail) {
                if (self.checkPresetTime(preset)) {
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
        var farm = this.farmOverflow

        var unitsCopy = angular.copy(farm.village.units)
        var unitsUsed = presetUsed.units

        for (var unit in unitsUsed) {
            unitsCopy[unit].in_town -= unitsUsed[unit]
        }

        var result = this.getPreset(unitsCopy)

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
        var farm = this.farmOverflow

        var travelTime = $armyService.calculateTravelTime(preset, {
            barbarian: !farm.target.pid,
            officers: false
        })

        var villagePosition = farm.village.position
        var targetPosition = {
            x: farm.target.x,
            y: farm.target.y
        }

        var distance = $math.actualDistance(villagePosition, targetPosition)

        var totalTravelTime = $armyService.getTravelTimeForDistance(
            preset,
            travelTime,
            distance,
            'attack'
        )

        var limitTime = time2seconds(farm.settings.maxTravelTime)

        return limitTime > totalTravelTime
    }

    /**
     * Emite o envio do comando para o servidor.

     * @param {Object} preset - Preset a ser enviado
     * @param {Function} callback - Chamado após a confirmação de
     * alteração das tropas na aldeia.
     */
    Commander.prototype.send = function (preset, callback) {
        if (!this.running) {
            return false
        }

        var self = this
        var farm = self.farmOverflow
        var unbindError
        var unbindSend

        self.simulate()

        // Por algum motivo a lista de comandos de algumas aldeias
        // não ficam sincronizadas com os comandos registrados no servidor
        // então atualizamos por nossa própria conta o objeto com os
        // comandos e reiniciamos os ataques.
        unbindError = self.onCommandError(function () {
            unbindSend()

            farm.village.updateCommands(function () {
                self.analyse()
            })
        })

        unbindSend = self.onCommandSend(function () {
            unbindError()
            farm.nextTarget()

            var interval
            
            // Intervalo mínimo de 1 segundo para que o jogo registre as
            // alterações das unidades no objeto local da aldeia.
            interval = randomSeconds(farm.settings.randomBase)
            interval = 1000 + (interval * 1000)

            self.timeoutId = setTimeout(function () {
                if (self.preventNextCommand) {
                    return self.handleError()
                }

                self.analyse()
            }, interval)

            farm.updateActivity()
        })

        $socket.emit($route.SEND_PRESET, {
            start_village: farm.village.id,
            target_village: farm.target.id,
            army_preset_id: preset.id,
            type: 'attack'
        })

        return true
    }

    /**
     * Chamado após a confirmação de alteração das tropas na aldeia.
     */
    Commander.prototype.onCommandSend = function (callback) {
        var farm =  this.farmOverflow
        var before = angular.copy(farm.village.units)
        
        var unbind = $root.$on($eventType.VILLAGE_UNIT_INFO, function (event, data) {
            if (farm.village.id !== data.village_id) {
                return false
            }

            var now = farm.village.units
            var equals = angular.equals(before, now)

            if (equals) {
                return false
            }

            farm.trigger('sendCommand', [
                farm.village,
                farm.target
            ])

            unbind()
            callback()
        })

        return unbind
    }

     /**
     * Chamado após a ocorrer um erro ao tentar enviar um comando.
     */
    Commander.prototype.onCommandError = function (callback) {
        var unbind = $root.$on($eventType.MESSAGE_ERROR, function (event, data) {
            if (!data.cause || !data.code) {
                return false
            }

            if (data.cause !== 'Command/sendPreset') {
                return false
            }

            if (data.code !== 'Command/attackLimitExceeded') {
                return false
            }

            farmOverflow.trigger('sendCommandError', [data.code])

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
        var farm = this.farmOverflow

        var attackingFactor = function () {
            $socket.emit($route.GET_ATTACKING_FACTOR, {
                target_id: farm.target.id
            })
        }

        attackingFactor()

        if (callback) {
            callback()
        }
    }

    return Commander
})
