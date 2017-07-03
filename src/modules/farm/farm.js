define('TWOverflow/Farm', [
    'TWOverflow/locale',
    'TWOverflow/Farm/Village',
    'helper/math',
    'conf/conf',
    'struct/MapData',
    'helper/mapconvert',
    'helper/time',
    'conf/locale',
    'Lockr'
], function (
    Locale,
    Village,
    $math,
    $conf,
    $mapData,
    $convert,
    $timeHelper,
    gameLocale,
    Lockr
) {
    /**
     * Previne do Farm ser executado mais de uma vez.
     * 
     * @type {Boolean}
     */
    var initialized = false

    /**
     * Tempo de validade dos índices dos alvos, é resetado quando o
     * Farm está pausado por mais de 30 minutos.
     *
     * @type {Number}
     */
    var INDEX_EXPIRE_TIME = 1000 * 60 * 30

    /**
     * Tempo de validade dos alvos adicionados nas prioridades após o script
     * ser parado.
     *
     * @type {Number}
     */
    var PRIORITY_EXPIRE_TIME = 1000 * 60 * 10

    /**
     * Limpa qualquer text entre (, [, {, " & ' do nome dos presets
     * para serem idetificados com o mesmo nome.
     *
     * @type {RegEx}
     */
    var rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/

    /**
     * Aldeias que prontas para serem usadas nos ataques.
     *
     * @type {Array}
     */
    var playerVillages = null

    /**
     * Aldeia atualmente selecionada.
     *
     * @type {Object} VillageModel
     */
    var selectedVillage = null

    /**
     * Identifica se o jogador possui apenas uma aldeia disponível para atacar.
     *
     * @type {Boolean}
     */
    var singleVillage = null

    /**
     * Lista de todos aldeias alvos possíveis para cada aldeia do jogador.
     *
     * @type {Object}
     */
    var villagesTargets = {}

    /**
     * Aldeias alvo atualmente selecionada.
     *
     * @type {Object}
     */
    var selectedTarget = null

    /**
     * Callbacks usados pelos eventos que são disparados no decorrer do script.
     *
     * @type {Object}
     */
    var eventListeners = {}

    /**
     * Propriedade usada para permitir ou não o disparo de eventos.
     *
     * @type {Boolean}
     */
    var eventsEnabled = true

    /**
     * Propriedade usada para permitir ou não a exibição de notificações.
     *
     * @type {Boolean}
     */
    var notifsEnabled = true

    /**
     * Preset usado como referência para enviar os comandos
     *
     * @type {Array}
     */
    var selectedPresets = []

    /**
     * Objeto do group de referência para ignorar aldeias/alvos.
     *
     * @type {Object}
     */
    var groupIgnore = null

    /**
     * Objeto do group de referência para incluir alvos.
     *
     * @type {Object}
     */
    var groupInclude = null

    /**
     * Objeto do group de referência para filtrar aldeias usadas
     * pelo Farm.
     *
     * @type {Object}
     */
    var groupOnly = null

    /**
     * Lista de aldeias ignoradas
     *
     * @type {Array}
     */
    var ignoredVillages = []

    /**
     * Lista de aldeias que serão permitidas atacar, independente de outros
     * fatores a não ser a distância.
     *
     * @type {Array}
     */
    var includedVillages = []

    /**
     * Armazena todas aldeias que não estão em confições de enviar comandos.
     *
     * @type {Object}
     */
    var waitingVillages = {}

    /**
     * Indica se não há nenhuma aldeia disponível (todas aguardando tropas).
     *
     * @type {Boolean}
     */
    var globalWaiting = false

    /**
     * Armazena o último evento que fez o farm entrar em modo de espera.
     * Usado para atualizar a mensagem de status quando o farm é reiniciado
     * manualmente.
     *
     * @type {String}
     */
    var lastError = ''

    /**
     * Lista de alvos com prioridade no envio dos ataques.
     * Alvos são adicionados nessa lista quando farms voltam lotados.
     *
     * @type {Object.<array>}
     */
    var priorityTargets = {}

    /**
     * Status do Farm.
     *
     * @type {String}
     */
    var currentStatus = 'paused'

    /**
     * Armazena todos os últimos eventos ocorridos no Farm.
     *
     * @type {Array}
     */
    var lastEvents

    /**
     * Timestamp da última atividade do Farm como atques e
     * trocas de aldeias.
     *
     * @type {Number}
     */
    var lastActivity

    /**
     * Timestamp da última atividade do Farm como atques e
     * trocas de aldeias.
     *
     * @type {Number}
     */
    var lastAttack

    /**
     * Armazena os índices dos alvos de cada aldeia disponível.
     *
     * @type {Object}
     */
    var targetIndexes

    /**
     * Objeto com dados do jogador.
     *
     * @type {Object}
     */
    var $player

    /**
     * Lista de filtros chamados no momendo do carregamento de alvos do mapa.
     *
     * @type {Array}
     */
    var mapFilters = [
        // IDs negativos são localizações reservadas para os jogadores como
        // segunda aldeia em construção, convidar um amigo e deposito de recursos.
        function (target) {
            if (target.id < 0) {
                return true
            }
        },

        // Aldeia do próprio jogador
        function (target) {
            if (target.character_id === $player.getId()) {
                return true
            }
        },

        // Impossivel atacar alvos protegidos
        function (target) {
            if (target.attack_protection) {
                return true
            }
        },

        // Aldeias de jogadores são permitidas caso estejam
        // no grupo de incluidas.
        function (target) {
            if (target.character_id) {
                var included = includedVillages.includes(target.id)

                if (!included) {
                    return true
                }   
            }
        },

        // Filtra aldeias pela pontuação
        function (target) {
            if (target.points < Farm.settings.minPoints) {
                return true
            }

            if (target.points > Farm.settings.maxPoints) {
                return true
            }
        },

        // Filtra aldeias pela distância
        function (target) {
            var coords = selectedVillage.position
            var distance = $math.actualDistance(coords, target)

            if (distance < Farm.settings.minDistance) {
                return true
            }

            if (distance > Farm.settings.maxDistance) {
                return true
            }
        }
    ]

    /**
     * Cria um novo controlador de comandos para o FarmOverflow.
     *
     * @return {Commander}
     */
    var createCommander = function () {
        var Commander = require('TWOverflow/Farm/Commander')
        
        return new Commander()
    }

    /**
     * Remove todas propriedades que tiverem valor zero.
     *
     * @param {Object} units - Unidades do preset a serem filtradas.
     */
    var cleanPresetUnits = function (units) {
        var pure = {}

        for (var unit in units) {
            if (units[unit] > 0) {
                pure[unit] = units[unit]
            }
        }

        return pure
    }

    /**
     * Salva no localStorage a lista dos últimos eventos ocorridos no Farm.
     */
    var updateLastEvents = function () {
        Lockr.set('farm-lastEvents', lastEvents)
    }

    /**
     * Atualiza o grupo de referência para ignorar aldeias e incluir alvos
     */
    var updateExceptionGroups = function () {
        var types = ['groupIgnore', 'groupInclude', 'groupOnly']
        var groups = $model.getGroupList().getGroups()

        types.forEach(function (type) {
            Farm[type] = null

            for (var id in groups) {
                if (id == Farm.settings[type]) {
                    Farm[type] = {
                        name: groups[id].name,
                        id: id
                    }

                    break
                }
            }
        })
    }

    /**
     * Atualiza a lista de aldeias ignoradas e incluidas
     */
    var updateExceptionVillages = function () {
        var groupList = $model.getGroupList()

        ignoredVillages = []
        includedVillages = []

        if (groupIgnore) {
            ignoredVillages =
                groupList.getGroupVillageIds(groupIgnore.id)
        }

        if (groupInclude) {
            includedVillages =
                groupList.getGroupVillageIds(groupInclude.id)
        }
    }

    /**
     * Atualiza a lista de aldeias do jogador e filtra com base nos grupos (caso
     * estaja configurado...).
     */
    var updatePlayerVillages = function () {
        var villages = $player.getVillageList()

        villages = villages.map(function (village) {
            return new Village(village)
        })

        villages = villages.filter(function (village) {
            return !ignoredVillages.includes(village.id)
        })

        if (groupOnly) {
            var groupList = $model.getGroupList()
            var groupVillages = groupList.getGroupVillageIds(groupOnly.id)

            villages = villages.filter(function (village) {
                return groupVillages.includes(village.id)
            })
        }

        playerVillages = villages
        singleVillage = playerVillages.length === 1
        selectedVillage = playerVillages[0]

        // Reinicia comandos imediatamente se liberar alguma aldeia
        // que nao esteja na lista de espera.
        if (Farm.commander && Farm.commander.running && globalWaiting) {
            for (var i = 0; i < villages.length; i++) {
                var village = villages[i]

                if (!waitingVillages[village.id]) {
                    globalWaiting = false
                    Farm.commander.analyse()

                    break
                }
            }
        }

        Farm.trigger('villagesUpdate')
    }

    /**
     * Obtem preset apropriado para o script
     *
     * @param {Function} callback
     */
    var updatePresets = function (callback) {
        var update = function (rawPresets) {
            selectedPresets = []

            if (!Farm.settings.presetName) {
                if (callback) {
                    callback()
                }

                return
            }

            for (var id in rawPresets) {
                if (!rawPresets.hasOwnProperty(id)) {
                    continue
                }

                var name = rawPresets[id].name
                var cleanName = name.replace(rpreset, '').trim()

                if (cleanName === Farm.settings.presetName) {
                    rawPresets[id].cleanName = cleanName
                    rawPresets[id].units = cleanPresetUnits(rawPresets[id].units)

                    selectedPresets.push(rawPresets[id])
                }
            }

            if (callback) {
                callback()
            }
        }

        if ($presetList.isLoaded()) {
            update($presetList.presets)
        } else {
            $socket.emit($route.GET_PRESETS, {}, function (data) {
                Farm.trigger('presetsLoaded')
                update(data.presets)
            })
        }
    }

    /**
     * Detecta todas atualizações de dados do jogo que são importantes
     * para o funcionamento do Farm.
     *
     * TODO
     * Encontrar um nome melhor para essa função
     */
    var listeners = function () {
        /**
         * Envia um mensagem resposta para a mensagem indicada
         *
         * @param  {Number} message_id - Identificação da mensagem.
         * @param  {String} message - Corpo da mensagem.
         */
        var replyMessage = function (message_id, message) {
            setTimeout(function () {
                $socket.emit($route.MESSAGE_REPLY, {
                    message_id: message_id,
                    message: message
                })
            }, 300)
        }

        /**
         * Remove aldeias da lista de espera e detecta se todas as aldeias
         * estavam na lista de espera, reiniciando o ciclo de ataques.
         *
         * @param  {Object} data - Dados do comando.
         */
        var commandBackHandler = function (_, data) {
            var vid = data.origin.id
            
            if (waitingVillages[vid]) {
                delete waitingVillages[vid]

                if (globalWaiting) {
                    globalWaiting = false

                    if (Farm.commander && Farm.commander.running) {
                        selectVillage(vid)

                        setTimeout(function () {
                            Farm.commander.analyse()
                        }, 10000)
                    }
                }

                return false
            }
        }

        /**
         * Detecta alterações e atualiza lista de predefinições
         * configuradas no script.
         */
        var updatePresetsHandler = function () {
            updatePresets()
            Farm.trigger('presetsChange')

            if (!selectedPresets.length) {
                if (Farm.commander && Farm.commander.running) {
                    Farm.trigger('noPreset')
                    Farm.stop()
                }
            }
        }

        /**
         * Atualiza lista de grupos configurados no script.
         * Atualiza a lista de aldeias incluidas/ignoradas com base
         * nos grupos.
         */
        var updateGroups = function () {
            updateExceptionGroups()
            updateExceptionVillages()

            Farm.trigger('groupsChanged')
        }

        /**
         * Detecta grupos que foram adicionados nas aldeias.
         * Atualiza a lista de alvos e aldeias do jogador.
         *
         * @param  {Object} data - Dados do grupo retirado/adicionado.
         */
        var updateGroupVillages = function (_, data) {
            updatePlayerVillages()

            if (!groupInclude) {
                return false
            }
            
            if (groupInclude.id === data.group_id) {
                villagesTargets = {}
            }
        }

        /**
         * Adiciona o grupo de "ignorados" no alvo caso o relatório do
         * ataque tenha causado alguma baixa nas tropas.
         *
         * @param  {Object} report - Dados do relatório recebido.
         */
        var ignoreOnLoss = function (report) {
            var target = targetExists(report.target_village_id)

            if (!target) {
                return false
            }

            ignoreVillage(target)

            return true
        }

        /**
         * Adiciona alvos na lista de prioridades caso o relatório
         * do farm seja lotado.
         *
         * @param  {Object} report - Dados do relatório recebido.
         */
        var pushPriorityTarget = function (report) {
            var vid = report.attVillageId
            var tid = report.defVillageId

            priorityTargets[vid] = priorityTargets[vid] || []

            if (priorityTargets[vid].includes(tid)) {
                return false
            }

            priorityTargets[vid].push(tid)

            Farm.trigger('priorityTargetAdded', [{
                id: tid,
                name: report.defVillageName,
                x: report.defVillageX,
                y: report.defVillageY
            }])
        }

        /**
         * Analisa todos relatórios de ataques causados pelo Farm.
         *
         * @param  {Object} data - Dados do relatório recebido.
         */
        var reportHandler = function (_, data) {
            if (data.type !== 'attack') {
                return false
            }

            var queue = []

            // BATTLE_RESULTS = {
            //     '1'         : 'nocasualties',
            //     '2'         : 'casualties',
            //     '3'         : 'defeat'
            // }
            if (Farm.settings.ignoreOnLoss && data.result !== 1) {
                ignoreOnLoss(data)
            }

            // HAUL_TYPES = {
            //     'FULL'      : 'full',
            //     'PARTIAL'   : 'partial',
            //     'NONE'      : 'none'
            // }
            if (Farm.settings.priorityTargets && data.haul === 'full') {
                queue.push(pushPriorityTarget)
            }

            if (!queue.length) {
                return false
            }

            $socket.emit($route.REPORT_GET, {
                id: data.id
            }, function (data) {
                // Manter o relatório marcado como "Novo"
                $socket.emit($route.REPORT_MARK_UNREAD, {
                    reports: [data.id]
                }, function () {})

                var report = data.ReportAttack

                queue.every(function (handler) {
                    handler(report)
                })
            })
        }

        /**
         * Detecta quando a conexão é reestabelecida, podendo
         * reiniciar o script.
         */
        var reconnectHandler = function () {
            if (Farm.commander && Farm.commander.running) {
                setTimeout(function () {
                    disableNotifs(function () {
                        Farm.stop()
                        Farm.start()
                    })
                }, 3000)
            }
        }

        /**
         * Detecta mensagens do jogador enviadas para sí mesmo, afim de iniciar
         * e pausar o farm remotamente.
         *
         * @param  {[type]} data - Dados da mensagem recebida.
         */
        var remoteHandler = function (_, data) {
            var id = Farm.settings.remoteId
            var replayMessage = '[color=0a8028]OK[/color]'

            if (data.participants.length !== 1 || data.title !== id) {
                return false
            }

            var userMessage = data.message.content.trim().toLowerCase()

            switch (userMessage) {
            case 'on':
                disableNotifs(function () {
                    Farm.stop()
                    Farm.start()
                })

                replyMessage(data.message_id, replayMessage)
                Farm.trigger('remoteCommand', ['on'])

                break
            case 'off':
                disableNotifs(function () {
                    Farm.stop()
                })

                replyMessage(data.message_id, replayMessage)
                Farm.trigger('remoteCommand', ['off'])

                break
            case 'status':
                var villageLabel = selectedVillage.name + ' (' + selectedVillage.x + '|' + selectedVillage.y + ')'
                var readableLastAttack = readableDateFilter(lastAttack)

                var bbcodeMessage = [
                    '[b]' + Locale('farm', 'events.status') + ':[/b] ',
                    Locale('farm', 'events.' + currentStatus) + '[br]',
                    '[b]' + Locale('farm', 'events.selectedVillage') + ':[/b] ',
                    '[village=' + selectedVillage.id + ']' + villageLabel + '[/village][br]',
                    '[b]' + Locale('farm', 'events.lastAttack') + ':[/b] ' + readableLastAttack
                ].join('')

                replyMessage(data.message_id, bbcodeMessage)
                Farm.trigger('remoteCommand', ['status'])

                break
            }

            return false
        }

        $root.$on($eventType.COMMAND_RETURNED, commandBackHandler)
        $root.$on($eventType.ARMY_PRESET_UPDATE, updatePresetsHandler)
        $root.$on($eventType.ARMY_PRESET_DELETED, updatePresetsHandler)
        $root.$on($eventType.GROUPS_UPDATED, updateGroups)
        $root.$on($eventType.GROUPS_CREATED, updateGroups)
        $root.$on($eventType.GROUPS_DESTROYED, updateGroups)
        $root.$on($eventType.GROUPS_VILLAGE_LINKED, updateGroupVillages)
        $root.$on($eventType.GROUPS_VILLAGE_UNLINKED, updateGroupVillages)
        $root.$on($eventType.REPORT_NEW, reportHandler)
        $root.$on($eventType.RECONNECT, reconnectHandler)        
        $root.$on($eventType.MESSAGE_SENT, remoteHandler)

        // Carrega pedaços da mapa quando chamado.
        // É disparado através do método .getTargets()
        $mapData.setRequestFn(function (args) {
            $socket.emit($route.MAP_GETVILLAGES, args)
        })

        // Lista de eventos para atualizar o último status do Farm.
        Farm.bind('sendCommand', function () {
            updateLastAttack()
            currentStatus = 'attacking'
        })

        Farm.bind('noPreset', function () {
            currentStatus = 'paused'
        })

        Farm.bind('noUnits', function () {
            currentStatus = 'noUnits'
        })

        Farm.bind('noUnitsNoCommands', function () {
            currentStatus = 'noUnitsNoCommands'
        })

        Farm.bind('start', function () {
            currentStatus = 'attacking'
        })

        Farm.bind('pause', function () {
            currentStatus = 'paused'
        })

        Farm.bind('startLoadingTargers', function () {
            currentStatus = 'loadingTargets'
        })

        Farm.bind('endLoadingTargers', function () {
            currentStatus = 'analyseTargets'
        })

        Farm.bind('commandLimitSingle', function () {
            currentStatus = 'commandLimit'
        })

        Farm.bind('commandLimitMulti', function () {
            currentStatus = 'noVillages'
        })
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o Farm.
     */
    var updateLastAttack = function () {
        lastAttack = $timeHelper.gameTime()
        Lockr.set('farm-lastAttack', lastAttack)
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    var disableEvents = function (callback) {
        eventsEnabled = false
        callback()
        eventsEnabled = true
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    var disableNotifs = function (callback) {
        notifsEnabled = false
        callback()
        notifsEnabled = true
    }

    /**
     * Seleciona uma aldeia específica do jogador.
     *
     * @param {Number} vid - ID da aldeia à ser selecionada.
     * @return {Boolean}
     */
    var selectVillage = function (vid) {
        var i = playerVillages.indexOf(vid)

        if (i !== -1) {
            selectedVillage = playerVillages[i]

            return true
        }

        return false
    }

    /**
     * Ativa um lista de presets na aldeia selecionada.
     *
     * @param {Array} presetIds - Lista com os IDs dos presets
     * @param {Function} callback
     */
    var assignPresets = function (presetIds, callback) {
        $socket.emit($route.ASSIGN_PRESETS, {
            village_id: selectedVillage.id,
            preset_ids: presetIds
        }, callback)
    }

    /**
     * Adiciona a aldeia especificada no grupo de aldeias ignoradas
     *
     * @param {Object} target - Dados da aldeia a ser ignorada.
     */
    var ignoreVillage = function (target) {
        if (!groupIgnore) {
            return false
        }

        $socket.emit($route.GROUPS_LINK_VILLAGE, {
            group_id: groupIgnore.id,
            village_id: target.id
        }, function () {
            Farm.trigger('ignoredVillage', [target])
        })
    }

    /**
     * Verifica se o alvo está relacionado a alguma aldeia do jogador.
     *
     * @param {Number} targetId - ID da aldeia
     */
    var targetExists = function (targetId) {
        for (var vid in villagesTargets) {
            var villageTargets = villagesTargets[vid]

            for (var i = 0; i < villageTargets.length; i++) {
                var target = villageTargets[i]

                if (target.id === targetId) {
                    return target
                }
            }
        }

        return false
    }

    var Farm = {}

    /**
     * Versão do script.
     *
     * @type {String}
     */
    Farm.version = '___farmVersion'

    Farm.init = function () {
        Locale.create('farm', ___langFarm, 'en')

        initialized = true

        /**
         * Configurações salvas localmente
         * 
         * @type {Object}
         */
        var localSettings = Lockr.get('farm-settings', {}, true)

        /**
         * Configurações do jogador + configurações padrões
         *
         * @type {Object}
         */
        Farm.settings = angular.merge({}, {
            maxDistance: 10,
            minDistance: 0,
            maxTravelTime: '01:00:00',
            randomBase: 3, // segundos
            presetName: '',
            groupIgnore: 0,
            groupInclude: 0,
            groupOnly: 0,
            minPoints: 0,
            maxPoints: 12500,
            eventsLimit: 20,
            ignoreOnLoss: true,
            language: gameLocale.LANGUAGE.split('_')[0],
            priorityTargets: true,
            eventAttack: true,
            eventVillageChange: true,
            eventPriorityAdd: true,
            eventIgnoredVillage: true,
            remoteId: 'remote',
            hotkeySwitch: 'shift+z',
            hotkeyWindow: 'z'
        }, localSettings)

        lastEvents = Lockr.get('farm-lastEvents', [], true)
        lastActivity = Lockr.get('farm-lastActivity', $timeHelper.gameTime(), true)
        lastAttack = Lockr.get('farm-lastAttack', -1, true)
        targetIndexes = Lockr.get('farm-indexes', {}, true)

        $player = $model.getSelectedCharacter()

        updateExceptionGroups()
        updateExceptionVillages()
        updatePlayerVillages()
        updatePresets()
        listeners()

        Locale.change('farm', Farm.settings.language)
    }

    /**
     * Inicia os comandos.
     *
     * @return {Boolean}
     */
    Farm.start = function () {
        if (!selectedPresets.length) {
            if (notifsEnabled) {
                emitNotif('error', Locale('farm', 'events.presetFirst'))
            }

            return false
        }

        if (!selectedVillage) {
            if (notifsEnabled) {
                emitNotif('error', Locale('farm', 'events.noSelectedVillage'))
            }
            
            return false
        }

        var now = $timeHelper.gameTime()

        // Reseta a lista prioridades caso tenha expirado
        if (now > Farm.lastActivity + PRIORITY_EXPIRE_TIME) {
            priorityTargets = {}
        }

        // Reseta a lista índices caso tenha expirado
        if (now > Farm.lastActivity + INDEX_EXPIRE_TIME) {
            targetIndexes = {}
            Lockr.set('farm-indexes', {})
        }

        Farm.commander = createCommander()
        Farm.commander.start()

        if (notifsEnabled) {
            emitNotif('success', Locale('farm', 'general.started'))
        }

        Farm.trigger('start')

        return true
    }

    /**
     * Pausa os comandos.
     *
     * @return {Boolean}
     */
    Farm.stop = function () {
        Farm.commander.stop()
        
        if (notifsEnabled) {
            emitNotif('success', Locale('farm', 'general.paused'))
        }

        Farm.trigger('pause')

        return true
    }

    /**
     * Alterna entre iniciar e pausar o script.
     */
    Farm.switch = function () {
        if (Farm.commander && Farm.commander.running) {
            Farm.stop()
        } else {
            Farm.start()
        }
    }

    /**
     * Atualiza o timestamp da última atividade do Farm.
     */
    Farm.updateActivity = function () {
        Farm.lastActivity = $timeHelper.gameTime()
        Lockr.set('farm-lastActivity', Farm.lastActivity)
    }

    /**
     * Atualiza as novas configurações passados pelo usuário e as fazem
     * ter efeito caso o farm esteja em funcionamento.
     *
     * @param {Object} changes - Novas configurações.
     */
    Farm.updateSettings = function (changes) {
        var modify = {}

        // Valores que precisam ser resetados/modificados quando
        // configuração x é alterada.
        var updates = {
            groupIgnore: ['groups'],
            groupInclude: ['groups', 'targets'],
            groupOnly: ['groups', 'villages', 'targets'],
            presetName: ['preset'],
            minDistance: ['targets'],
            maxDistance: ['targets'],
            minPoints: ['targets'],
            maxPoints: ['targets'],
            eventsLimit: ['events'],
            eventAttack: ['events'],
            eventVillageChange: ['events'],
            eventPriorityAdd: ['events'],
            eventIgnoredVillage: ['events'],
            language: ['language']
        }

        for (var key in changes) {
            if (changes[key] !== Farm.settings[key]) {
                var modifyKeys = updates[key]

                if (updates.hasOwnProperty(key)) {
                    for (var i = 0; i < modifyKeys.length; i++) {
                        modify[modifyKeys[i]] = true
                    }
                }
            }

            Farm.settings[key] = changes[key]
        }

        Lockr.set('farm-settings', Farm.settings)

        // Nenhuma alteração nas configurações
        if (angular.equals(modify, {})) {
            return false
        }

        if (modify.groups) {
            updateExceptionGroups()
            updateExceptionVillages()
        }

        if (modify.villages) {
            updatePlayerVillages()
        }

        if (modify.preset) {
            updatePresets()
        }

        if (modify.targets) {
            villagesTargets = {}
        }

        if (modify.events) {
            Farm.trigger('resetEvents')
        }

        if (modify.language) {
            if (eventsEnabled) {
                emitNotif('success', Locale('farm', 'settings.events.restartScript'))
            }
        }

        if (Farm.commander && Farm.commander.running && globalWaiting) {
            disableEvents(function () {
                Farm.stop()
                Farm.start()
            })
        }

        Farm.trigger('settingsChange', [modify])
    }

    /** 
     * Seleciona o próximo alvo da aldeia.
     *
     * @param [_selectOnly] Apenas seleciona o alvo sem pular para o próximo.
     */
    Farm.nextTarget = function (_selectOnly) {
        var sid = selectedVillage.id

        // Caso a lista de alvos seja resetada no meio da execução.
        if (!villagesTargets[sid]) {
            Farm.commander.analyse()

            return false
        }

        var villageTargets = villagesTargets[sid]

        if (Farm.settings.priorityTargets && priorityTargets[sid]) {
            var priorityId

            while (priorityId = priorityTargets[sid].shift()) {
                if (ignoredVillages.includes(priorityId)) {
                    continue
                }

                for (var i = 0; i < villageTargets.length; i++) {
                    if (villageTargets[i].id === priorityId) {
                        selectedTarget = villageTargets[i]
                        return true
                    }
                }
            }
        }

        var index = targetIndexes[sid]
        var changed = false

        if (!_selectOnly) {
            index = ++targetIndexes[sid]
        }

        for (; index < villageTargets.length; index++) {
            var target = villageTargets[index]

            if (ignoredVillages.includes(target.id)) {
                Farm.trigger('ignoredTarget', [target])

                continue
            }

            selectedTarget = target
            changed = true

            break
        }

        if (changed) {
            targetIndexes[sid] = index
        } else {
            selectedTarget = villageTargets[0]
            targetIndexes[sid] = 0
        }

        Lockr.set('farm-indexes', targetIndexes)

        return true
    }

    /**
     * Verifica se a aldeia selecionada possui alvos e se tiver, atualiza
     * o objecto do alvo e o índice.
     */
    Farm.hasTarget = function () {
        var sid = selectedVillage.id
        var index = targetIndexes[sid]
        var targets = villagesTargets[sid]

        if (!targets.length) {
            return false
        }

        // Verifica se tem alvos e se o índice selecionado possui alvo.
        // Pode acontecer quando o numero de alvos é reduzido em um
        // momento em que o Farm não esteja ativado.
        if (index > targets.length) {
            targetIndexes[sid] = index = 0
        }

        return !!targets[index]
    }

    /**
     * Obtem a lista de alvos para a aldeia selecionada.
     */
    Farm.getTargets = function (callback) {
        var coords = selectedVillage.position
        var sid = selectedVillage.id

        if (sid in villagesTargets) {
            return callback()
        }

        var filteredTargets = []

        // Carregando 25 campos a mais para preencher alguns setores
        // que não são carregados quando a aldeia se encontra na borda.
        var chunk = $conf.MAP_CHUNK_SIZE
        var x = coords.x - chunk
        var y = coords.y - chunk
        var w = chunk * 2
        var h = chunk * 2

        var load = function () {
            var loaded = $mapData.hasTownDataInChunk(x, y)

            if (loaded) {
                loop()
            } else {
                Farm.trigger('startLoadingTargers')

                var loads = $convert.scaledGridCoordinates(x, y, w, h, chunk)
                var length = loads.length
                var index = 0

                $mapData.loadTownDataAsync(x, y, w, h, function () {
                    if (++index === length) {
                        Farm.trigger('endLoadingTargers')

                        loop()
                    }
                })
            }

            return 
        }

        var loop = function () {
            var sectors = $mapData.loadTownData(x, y, w, h, chunk)
            var i = sectors.length

            while (i--) {
                var sector = sectors[i]
                var sectorDataX = sector.data

                for (var sx in sectorDataX) {
                    var sectorDataY = sectorDataX[sx]

                    for (var sy in sectorDataY) {
                        var village = sectorDataY[sy]
                        var pass = filter(village)

                        if (pass) {
                            filteredTargets.push(pass)
                        }
                    }
                }
            }

            done()
        }

        var filter = function (target) {
            var pass = mapFilters.every(function (fn) {
                return !fn(target)
            })

            if (!pass) {
                return false
            }

            return {
                x: target.x,
                y: target.y,
                distance: $math.actualDistance(coords, target),
                id: target.id,
                name: target.name,
                pid: target.character_id
            }
        }

        var done = function () {
            if (filteredTargets.length === 0) {
                var hasVillages = Farm.nextVillage()

                if (hasVillages) {
                    Farm.getTargets(callback)
                } else {
                    Farm.trigger('noTargets')
                }

                return false
            }

            villagesTargets[sid] = filteredTargets.sort(function (a, b) {
                return a.distance - b.distance
            })

            if (targetIndexes.hasOwnProperty(sid)) {
                if (targetIndexes[sid] > villagesTargets[sid].length) {
                    targetIndexes[sid] = 0

                    Lockr.set('farm-indexes', targetIndexes)
                }
            } else {
                targetIndexes[sid] = 0

                Lockr.set('farm-indexes', targetIndexes)
            }

            callback()
        }

        return load()
    }

    /**
     * Seleciona a próxima aldeia do jogador.
     *
     * @return {Boolean}
     */
    Farm.nextVillage = function () {
        if (singleVillage) {
            return false
        }

        var free = playerVillages.filter(function (village) {
            return !waitingVillages[village.id]
        })

        if (!free.length) {
            Farm.trigger('noVillages')
            return false
        } else if (free.length === 1) {
            selectedVillage = free[0]
            Farm.trigger('nextVillage', [selectedVillage])
            return true
        }

        var index = free.indexOf(selectedVillage) + 1
        selectedVillage = free[index] ? free[index] : free[0]
        
        Farm.trigger('nextVillage', [selectedVillage])
        Farm.updateActivity()

        return true
    }

    /**
     * Registra um evento.
     *
     * @param {String} event - Nome do evento.
     * @param {Function} handler - Função chamada quando o evento for disparado.
     */
    Farm.bind = function (event, handler) {
        if (!eventListeners.hasOwnProperty(event)) {
            eventListeners[event] = []
        }

        eventListeners[event].push(handler)
    }

    /**
     * Chama os eventos.
     *
     * @param {String} event - Nome do evento.
     * @param {Array} args - Argumentos que serão passados no callback.
     */
    Farm.trigger = function (event, args) {
        if (!eventsEnabled) {
            return
        }

        if (eventListeners.hasOwnProperty(event)) {
            eventListeners[event].forEach(function (handler) {
                handler.apply(Farm, args)
            })
        }
    }

    /**
     * Verifica se aldeia tem os presets necessários ativados na aldeia
     * e ativa os que faltarem.
     *
     * @param {Array} presetIds - Lista com os IDs dos presets
     * @param {Function} callback
     */
    Farm.checkPresets = function (callback) {
        if (!selectedPresets.length) {
            Farm.stop()
            Farm.trigger('noPreset')

            return false
        }
        
        var vid = selectedVillage.id
        var villagePresets = $presetList.getPresetsByVillageId(vid)
        var needAssign = false
        var which = []

        selectedPresets.forEach(function (preset) {
            if (!villagePresets.hasOwnProperty(preset.id)) {
                needAssign = true
                which.push(preset.id)
            }
        })

        if (needAssign) {
            for (var id in villagePresets) {
                which.push(id)
            }

            assignPresets(which, callback)
        } else {
            callback()
        }
    }

    /**
     * Verifica se a aldeia atualmente selecionada tem os alvos carregados.
     *
     * @return {Boolean}
     */
    Farm.targetsLoaded = function () {
        return villagesTargets.hasOwnProperty(selectedVillage.id)
    }

    /**
     * Verifica se há alguma aldeia selecionada pelo FarmOverflow.
     *
     * @return {Boolean}
     */
    Farm.hasVillage = function () {
        return !!selectedVillage
    }

    /**
     * Verifica se a aldeia atualmente selecionada está em modo de espera.
     *
     * @return {Boolean}
     */
    Farm.isWaiting = function () {
        return waitingVillages.hasOwnProperty(selectedVillage.id)
    }

    /**
     * Verifica se a aldeia atualmente selecionada está ignorada.
     *
     * @return {Boolean}
     */
    Farm.isIgnored = function () {
        return ignoredVillages.includes(selectedVillage.id)
    }

    /**
     * Verifica se todas aldeias estão em modo de espera.
     *
     * @return {Boolean}
     */
    Farm.isAllWaiting = function () {
        for (var i = 0; i < playerVillages.length; i++) {
            var vid = playerVillages[i].id

            if (!waitingVillages.hasOwnProperty(vid)) {
                return false
            }
        }

        return true
    }

    /**
     * Atualiza o último status do FarmOverflow.
     *
     * @param {String} newLastEvents - Novo status
     */
    Farm.setLastEvents = function (newLastEvents) {
        lastEvents = newLastEvents

        updateLastEvents()
    }

    /**
     * Obtem o último status do FarmOverflow.
     *
     * @return {String}
     */
    Farm.getLastEvents = function () {
        return lastEvents
    }

    /**
     * Obtem a aldeia atualmente selecionada.
     *
     * @return {Object}
     */
    Farm.getSelectedVillage = function () {
        return selectedVillage
    }

    /**
     * Retorna se há apenas uma aldeia sendo utilizada pelo FarmOverflow.
     *
     * @return {Boolean}
     */
    Farm.isSingleVillage = function () {
        return singleVillage
    }

    /**
     * Obtem o alvo atualmente selecionado pelo FarmOverflow.
     *
     * @return {Object}
     */
    Farm.getSelectedTarget = function () {
        return selectedTarget
    }

    /**
     * Retorna se as notificações do FarmOverflow estão ativadas.
     *
     * @return {Boolean}
     */
    Farm.isNotifsEnabled = function () {
        return notifsEnabled
    }

    /**
     * Obtem o preset atualmente selecionado pelo FarmOverflow.
     *
     * @return {Array} Lista de presets que possuem a mesma identificação.
     */
    Farm.getSelectedPresets = function () {
        return selectedPresets
    }

    /**
     * Coloca uma aldeia em modo de espera.
     *
     * @param {Number} id - ID da aldeia.
     */
    Farm.setWaitingVillages = function (id) {
        waitingVillages[id] = true
    }

    /**
     * Coloca o FarmOverflow em modo de espera global, ou seja, todas aldeias
     * estão em modo de espera.
     */
    Farm.setGlobalWaiting = function () {
        globalWaiting = true
    }

    /**
     * Obtem o último erro ocorrido no FarmOveflow.
     *
     * @return {String}
     */
    Farm.getLastError = function () {
        return lastError
    }

    /**
     * Altera a string do último erro ocorrigo no FarmOverflow.
     *
     * @param {String} error
     */
    Farm.setLastError = function (error) {
        lastError = error
    }

    /**
     * Retorna se o FarmOverflow já foi inicializado.
     *
     * @return {Boolean}
     */
    Farm.isInitialized = function () {
        return initialized
    }

    /**
     * Obtem o timestamp do último ataque realizado pelo FarmOverflow.
     *
     * @return {Number} Timestamp do último ataque.
     */
    Farm.getLastAttack = function () {
        return lastAttack
    }

    return Farm
})
