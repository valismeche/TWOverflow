define('TWOverflow/Farm/Commander', [
    'TWOverflow/Farm',
    'helper/math'
], function (Farm, $math) {
    /**
     * @class
     *
     * Controla os ciclos de comandos, enviando ataques, alternando
     * aldeias e alvos.
     */
    function Commander () {
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

        return this
    }

    Commander.prototype.start = function () {
        Farm.trigger('start')
        this.running = true
        this.analyse()
    }

    Commander.prototype.stop = function () {
        Farm.trigger('pause')
        this.running = false
        clearTimeout(this.timeoutId)
    }

    Commander.prototype.analyse = function () {
        var self = this
        
        if (!self.running) {
            return
        }

        if (!Farm.presets.length) {
            Farm.stop()
            Farm.trigger('noPreset')

            return
        }

        if (!Farm.hasVillage()) {
            return Farm.trigger('noVillageSelected')
        }

        var selectedVillage = Farm.getSelectedVillage()

        if (!selectedVillage.loaded()) {
            selectedVillage.load(function () {
                self.analyse()
            })

            return
        }

        if (Farm.isWaiting() || Farm.isIgnored()) {
            if (Farm.nextVillage()) {
                self.analyse()
            } else {
                Farm.trigger(Farm.lastError)
            }

            return
        }

        // Se aldeia ainda não tiver obtido a lista de alvos, obtem
        // os alvos e executa o comando novamente para dar continuidade.
        if (!Farm.targetsLoaded()) {
            return Farm.getTargets(function () {
                self.analyse()
            })
        }

        // Analisa se a aldeia selecionada possui algum alvo disponível
        // e o selecionada. Caso não tenha uma nova aldeia será selecionada.
        if (Farm.hasTarget()) {
            Farm.selectTarget()
        } else {
            if (Farm.nextVillage()) {
                self.analyse()
            } else {
                Farm.trigger('noTargets')
            }

            return
        }

        Farm.checkPresets(function () {
            if (selectedVillage.countCommands() >= 48) {
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
        Farm.lastError = error || this.preventNextCommand
        this.preventNextCommand = false

        var selectedVillage = Farm.getSelectedVillage()
        var sid = selectedVillage.id

        switch (Farm.lastError) {
        case 'timeLimit':
            Farm.nextTarget()
            this.analyse()

            break
        case 'noUnits':
            Farm.trigger('noUnits', [
                selectedVillage
            ])
            
            Farm.waiting[sid] = true
            
            if (Farm.singleVillage) {
                if (selectedVillage.countCommands() === 0) {
                    return Farm.trigger('noUnitsNoCommands')
                } else {
                    Farm.globalWaiting = true
                }
            } else {
                if (Farm.nextVillage()) {
                    this.analyse()
                } else {
                    Farm.globalWaiting = true
                }
            }

            break
        case 'commandLimit':
            Farm.waiting[sid] = true

            if (Farm.singleVillage) {
                Farm.globalWaiting = true

                Farm.trigger('commandLimitSingle', [
                    selectedVillage
                ])
            } else {
                if (Farm.isAllWaiting()) {
                    Farm.trigger('commandLimitMulti', [
                        selectedVillage
                    ])

                    Farm.globalWaiting = true

                    return false
                }

                Farm.nextVillage()
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
        var timeLimit = false
        var units = _units || Farm.getSelectedVillage().units

        for (var i = 0; i < Farm.presets.length; i++) {
            var preset = Farm.presets[i]
            var avail = true

            for (var unit in preset.units) {
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
        var unitsCopy = angular.copy(Farm.getSelectedVillage().units)
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
        var travelTime = $armyService.calculateTravelTime(preset, {
            barbarian: !Farm.target.pid,
            officers: false
        })

        var villagePosition = Farm.getSelectedVillage().position
        var targetPosition = {
            x: Farm.target.x,
            y: Farm.target.y
        }

        var distance = $math.actualDistance(villagePosition, targetPosition)

        var totalTravelTime = $armyService.getTravelTimeForDistance(
            preset,
            travelTime,
            distance,
            'attack'
        )

        var limitTime = time2seconds(Farm.settings.maxTravelTime)

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
        var unbindError
        var unbindSend
        var selectedVillage = Farm.getSelectedVillage()

        self.simulate()

        // Por algum motivo a lista de comandos de algumas aldeias
        // não ficam sincronizadas com os comandos registrados no servidor
        // então atualizamos por nossa própria conta o objeto com os
        // comandos e reiniciamos os ataques.
        unbindError = self.onCommandError(function () {
            unbindSend()

            selectedVillage.updateCommands(function () {
                self.analyse()
            })
        })

        unbindSend = self.onCommandSend(function () {
            unbindError()
            Farm.nextTarget()

            var interval
            
            // Intervalo mínimo de 1 segundo para que o jogo registre as
            // alterações das unidades no objeto local da aldeia.
            interval = randomSeconds(Farm.settings.randomBase)
            interval = 1000 + (interval * 1000)

            self.timeoutId = setTimeout(function () {
                if (self.preventNextCommand) {
                    return self.handleError()
                }

                self.analyse()
            }, interval)

            Farm.updateActivity()
        })

        $socket.emit($route.SEND_PRESET, {
            start_village: selectedVillage.id,
            target_village: Farm.target.id,
            army_preset_id: preset.id,
            type: 'attack'
        })

        return true
    }

    /**
     * Chamado após a confirmação de alteração das tropas na aldeia.
     */
    Commander.prototype.onCommandSend = function (callback) {
        var selectedVillage = Farm.getSelectedVillage()
        var before = angular.copy(selectedVillage.units)
        
        var unbind = $root.$on($eventType.VILLAGE_UNIT_INFO, function (event, data) {
            if (selectedVillage.id !== data.village_id) {
                return false
            }

            var now = selectedVillage.units
            var equals = angular.equals(before, now)

            if (equals) {
                return false
            }

            Farm.trigger('sendCommand', [
                selectedVillage,
                Farm.target
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

            Farm.trigger('sendCommandError', [data.code])

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
        var attackingFactor = function () {
            $socket.emit($route.GET_ATTACKING_FACTOR, {
                target_id: Farm.target.id
            })
        }

        attackingFactor()

        if (callback) {
            callback()
        }
    }

    return Commander
})
