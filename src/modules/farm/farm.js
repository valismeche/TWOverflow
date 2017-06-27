define('FarmOverflow/Farm/locale', [
    'FarmOverflow/locale'
], function (Locale) {
    return new Locale(___langFarm, 'en_us')
})

define('FarmOverflow/Farm', [
    'FarmOverflow/Farm/locale',
    'FarmOverflow/Farm/Commander',
    'FarmOverflow/Farm/Village',
    'helper/math',
    'conf/conf',
    'struct/MapData',
    'helper/mapconvert',
    'helper/time',
    'conf/locale',
    'Lockr'
], function (
    FarmLocale,
    Commander,
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
     * Remove todas propriedades que tiverem valor zero.
     *
     * @param {Object} units - Unidades do preset a serem filtradas.
     */
    function cleanPresetUnits (units) {
        var pure = {}

        for (var unit in units) {
            if (units[unit] > 0) {
                pure[unit] = units[unit]
            }
        }

        return pure
    }
    
    /**
     * Tempo de validade dos índices dos alvos, é resetado quando o
     * FarmOverflow está pausado por mais de 30 minutos.
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
     * Mesangem de retorno quando o farm é iniciado/pausado remotamente
     * via mensagem.
     *
     * @type {String}
     */
    var REMOTE_SWITCH_RESPONSE = '[color=0a8028]OK[/color]'

    /**
     * Limpa qualquer text entre (, [, {, " & ' do nome dos presets
     * para serem idetificados com o mesmo nome.
     *
     * @type {RegEx}
     */
    var rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/

    /**
     * Configurações padrões do Farm
     * 
     * @type {Object}
     */
    var DEFAULTS = {
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
        ignoreOnLoss: false,
        language: gameLocale.LANGUAGE,
        priorityTargets: true,
        eventAttack: true,
        eventVillageChange: true,
        eventPriorityAdd: true,
        eventIgnoredVillage: true,
        remoteId: 'remote',
        hotkeySwitch: 'shift+z',
        hotkeyWindow: 'z'
    }

    // publics

    var FarmOverflow = {}

    /**
     * Versão do script.
     *
     * @type {String}
     */
    FarmOverflow.version = '___farmOverlflowVersion'

    /**
     * Aldeias que prontas para serem usadas nos ataques.
     *
     * @type {Array}
     */
    FarmOverflow.villages = null

    /**
     * Aldeia atualmente selecionada.
     *
     * @type {Object} VillageModel
     */
    FarmOverflow.village = null

    /**
     * Identifica se o jogador possui apenas uma aldeia disponível para atacar.
     *
     * @type {Boolean}
     */
    FarmOverflow.singleVillage = null

    /**
     * Lista de todos aldeias alvos possíveis para cada aldeia do jogador.
     *
     * @type {Object}
     */
    FarmOverflow.targets = {}

    /**
     * Aldeias alvo atualmente selecionada.
     *
     * @type {Object}
     */
    FarmOverflow.target = null

    /**
     * Callbacks usados pelos eventos que são disparados no decorrer do script.
     *
     * @type {Object}
     */
    FarmOverflow.eventListeners = {}

    /**
     * Propriedade usada para permitir ou não o disparo de eventos.
     *
     * @type {Boolean}
     */
    FarmOverflow.eventsEnabled = true

    /**
     * Propriedade usada para permitir ou não a exibição de notificações.
     *
     * @type {Boolean}
     */
    FarmOverflow.notifsEnabled = true

    /**
     * Preset usado como referência para enviar os comandos
     *
     * @type {Array}
     */
    FarmOverflow.presets = []

    /**
     * Objeto do group de referência para ignorar aldeias/alvos.
     *
     * @type {Object}
     */
    FarmOverflow.groupIgnore = null

    /**
     * Objeto do group de referência para incluir alvos.
     *
     * @type {Object}
     */
    FarmOverflow.groupInclude = null

    /**
     * Objeto do group de referência para filtrar aldeias usadas
     * pelo FarmOverflow.
     *
     * @type {Object}
     */
    FarmOverflow.groupOnly = null

    /**
     * Lista de aldeias ignoradas
     *
     * @type {Array}
     */
    FarmOverflow.ignoredVillages = []

    /**
     * Lista de aldeias que serão permitidas atacar, independente de outros
     * fatores a não ser a distância.
     *
     * @type {Array}
     */
    FarmOverflow.includedVillages = []

    /**
     * Armazena os índices dos alvos de cada aldeia disponível.
     *
     * @type {Object}
     */
    FarmOverflow.indexes = Lockr.get('farm-indexes', {}, true)

    /**
     * Armazena todas aldeias que não estão em confições de enviar comandos.
     *
     * @type {Object}
     */
    FarmOverflow.waiting = {}

    /**
     * Indica se não há nenhuma aldeia disponível (todas aguardando tropas).
     *
     * @type {Boolean}
     */
    FarmOverflow.globalWaiting = false

    /**
     * Armazena o último evento que fez o farm entrar em modo de espera.
     * Usado para atualizar a mensagem de status quando o farm é reiniciado
     * manualmente.
     *
     * @type {String}
     */
    FarmOverflow.lastError = ''

    /**
     * Lista de alvos com prioridade no envio dos ataques.
     * Alvos são adicionados nessa lista quando farms voltam lotados.
     *
     * @type {Object.<array>}
     */
    FarmOverflow.priorityTargets = {}

    /**
     * Lista com todas funções "unbind" dos listeners $on.
     *
     * @type {Array}
     */
    FarmOverflow.activeListeners = []

    /**
     * Timestamp da última atividade do FarmOverflow como atques e
     * trocas de aldeias.
     *
     * @type {Number}
     */
    FarmOverflow.lastActivity = Lockr.get('farm-lastActivity', $timeHelper.gameTime(), true)

    /**
     * Timestamp da última atividade do FarmOverflow como atques e
     * trocas de aldeias.
     *
     * @type {Number}
     */
    FarmOverflow.lastAttack = Lockr.get('farm-lastAttack', -1, true)

    /**
     * Status do FarmOverflow.
     *
     * @type {String}
     */
    FarmOverflow.status = 'events.paused'

    FarmOverflow.init = function () {
        /**
         * Previne do Farm ser executado mais de uma vez.
         * 
         * @type {Boolean}
         */
        FarmOverflow.initialized = true

        /**
         * Configurações salvas localmente
         * 
         * @type {Object}
         */
        var localSettings = Lockr.get('farm-settings', {}, true)

        /**
         * Obtem configurações locais x defaults.
         *
         * @type {Object}
         */
        FarmOverflow.settings = angular.merge({}, DEFAULTS, localSettings)

        /**
         * Objeto com dados do jogador.
         *
         * @type {Object}
         */
        FarmOverflow.player = $model.getSelectedCharacter()

        /**
         * Classe que controla os ciclos de ataques.
         */
        FarmOverflow.commander = new Commander(FarmOverflow)

        FarmOverflow.updateExceptionGroups()
        FarmOverflow.updateExceptionVillages()
        FarmOverflow.updatePlayerVillages()
        FarmOverflow.updatePresets()
        FarmOverflow.listeners()

        FarmLocale.change(FarmOverflow.settings.language)
    }

    /**
     * Inicia os comandos.
     *
     * @return {Boolean}
     */
    FarmOverflow.start = function () {
        if (!FarmOverflow.presets.length) {
            if (FarmOverflow.notifsEnabled) {
                emitNotif('error', FarmLocale('events.presetFirst'))
            }

            return false
        }

        if (!FarmOverflow.village) {
            if (FarmOverflow.notifsEnabled) {
                emitNotif('error', FarmLocale('events.noSelectedVillage'))
            }
            
            return false
        }

        var now = $timeHelper.gameTime()

        // Reseta a lista prioridades caso tenha expirado
        if (now > FarmOverflow.lastActivity + PRIORITY_EXPIRE_TIME) {
            FarmOverflow.priorityTargets = {}
        }

        // Reseta a lista índices caso tenha expirado
        if (now > FarmOverflow.lastActivity + INDEX_EXPIRE_TIME) {
            FarmOverflow.indexes = {}
            Lockr.set('farm-indexes', {})
        }

        FarmOverflow.commander = new Commander(FarmOverflow)
        FarmOverflow.commander.start()

        if (FarmOverflow.notifsEnabled) {
            emitNotif('success', FarmLocale('general.started'))
        }

        FarmOverflow.trigger('start')

        return true
    }

    /**
     * Pausa os comandos.
     *
     * @return {Boolean}
     */
    FarmOverflow.stop = function () {
        FarmOverflow.commander.stop()
        
        if (FarmOverflow.notifsEnabled) {
            emitNotif('success', FarmLocale('general.paused'))
        }

        FarmOverflow.trigger('pause')

        return true
    }

    /**
     * Alterna entre iniciar e pausar o script.
     */
    FarmOverflow.switch = function () {
        if (FarmOverflow.commander && FarmOverflow.commander.running) {
            FarmOverflow.stop()
        } else {
            FarmOverflow.start()
        }
    }

    /**
     * Atualiza o timestamp da última atividade do FarmOverflow.
     */
    FarmOverflow.updateActivity = function () {
        FarmOverflow.lastActivity = $timeHelper.gameTime()
        Lockr.set('farm-lastActivity', FarmOverflow.lastActivity)
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o FarmOverflow.
     */
    FarmOverflow.updateLastAttack = function () {
        FarmOverflow.lastAttack = $timeHelper.gameTime()
        Lockr.set('farm-lastAttack', FarmOverflow.lastAttack)
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o FarmOverflow.
     */
    FarmOverflow.updateLastStatus = function (status) {
        FarmOverflow.status = FarmLocale(status)
    }

    /**
     * Atualiza as novas configurações passados pelo usuário e as fazem
     * ter efeito caso o farm esteja em funcionamento.
     *
     * @param {Object} changes - Novas configurações.
     */
    FarmOverflow.updateSettings = function (changes) {
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
            language: ['interface']
        }

        for (var key in changes) {
            if (changes[key] !== FarmOverflow.settings[key]) {
                var modifyKeys = updates[key]

                if (updates.hasOwnProperty(key)) {
                    for (var i = 0; i < modifyKeys.length; i++) {
                        modify[modifyKeys[i]] = true
                    }
                }
            }

            FarmOverflow.settings[key] = changes[key]
        }

        Lockr.set('farm-settings', FarmOverflow.settings)

        // Nenhuma alteração nas configurações
        if (angular.equals(modify, {})) {
            return false
        }

        if (modify.groups) {
            FarmOverflow.updateExceptionGroups()
            FarmOverflow.updateExceptionVillages()
        }

        if (modify.villages) {
            FarmOverflow.updatePlayerVillages()
        }

        if (modify.preset) {
            FarmOverflow.updatePresets()
        }

        if (modify.targets) {
            FarmOverflow.targets = {}
        }

        if (modify.events) {
            FarmOverflow.trigger('resetEvents')
        }

        if (modify.interface) {
            FarmLocale.change(FarmOverflow.settings.language)
            FarmOverflow.trigger('reloadInterface')
        }

        if (FarmOverflow.commander.running && FarmOverflow.globalWaiting) {
            FarmOverflow.disableEvents(function () {
                FarmOverflow.stop()
                FarmOverflow.start()
            })
        }

        FarmOverflow.trigger('settingsChange', [modify])
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    FarmOverflow.disableEvents = function (callback) {
        FarmOverflow.eventsEnabled = false
        callback()
        FarmOverflow.eventsEnabled = true
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    FarmOverflow.disableNotifs = function (callback) {
        FarmOverflow.notifsEnabled = false
        callback()
        FarmOverflow.notifsEnabled = true
    }

    /** 
     * Seleciona o próximo alvo da aldeia.
     *
     * @param [_selectOnly] Apenas seleciona o alvo sem pular para o próximo.
     */
    FarmOverflow.nextTarget = function (_selectOnly) {
        var sid = FarmOverflow.village.id

        // Caso a lista de alvos seja resetada no meio da execução.
        if (!FarmOverflow.targets[sid]) {
            FarmOverflow.commander.analyse()

            return false
        }

        var villageTargets = FarmOverflow.targets[sid]

        if (FarmOverflow.settings.priorityTargets && FarmOverflow.priorityTargets[sid]) {
            var priorityId

            while (priorityId = FarmOverflow.priorityTargets[sid].shift()) {
                if (FarmOverflow.ignoredVillages.includes(priorityId)) {
                    continue
                }

                for (var i = 0; i < villageTargets.length; i++) {
                    if (villageTargets[i].id === priorityId) {
                        FarmOverflow.target = villageTargets[i]
                        return true
                    }
                }
            }
        }

        var index = FarmOverflow.indexes[sid]
        var changed = false

        if (!_selectOnly) {
            index = ++FarmOverflow.indexes[sid]
        }

        for (; index < villageTargets.length; index++) {
            var target = villageTargets[index]

            if (FarmOverflow.ignoredVillages.includes(target.id)) {
                FarmOverflow.trigger('ignoredTarget', [target])

                continue
            }

            FarmOverflow.target = target
            changed = true

            break
        }

        if (changed) {
            FarmOverflow.indexes[sid] = index
        } else {
            FarmOverflow.target = villageTargets[0]
            FarmOverflow.indexes[sid] = 0
        }

        Lockr.set('farm-indexes', FarmOverflow.indexes)

        return true
    }

    /** 
     * Atalho para selecionar alvo sem pular para o próximo.
     */
    FarmOverflow.selectTarget = function () {
        return FarmOverflow.nextTarget(true)
    }

    /**
     * Verifica se a aldeia selecionada possui alvos e se tiver, atualiza
     * o objecto do alvo e o índice.
     */
    FarmOverflow.hasTarget = function () {
        var sid = FarmOverflow.village.id
        var index = FarmOverflow.indexes[sid]
        var targets = FarmOverflow.targets[sid]

        if (!targets.length) {
            return false
        }

        // Verifica se tem alvos e se o índice selecionado possui alvo.
        // Pode acontecer quando o numero de alvos é reduzido em um
        // momento em que o FarmOverflow não esteja ativado.
        if (index > targets.length) {
            FarmOverflow.indexes[sid] = index = 0
        }

        return !!targets[index]
    }

    /**
     * Lista de filtros chamados no momendo do carregamento de alvos do mapa.
     */
    FarmOverflow.mapFilters = [
        // IDs negativos são localizações reservadas para os jogadores como
        // segunda aldeia em construção, convidar um amigo e deposito de recursos.
        function (target) {
            if (target.id < 0) {
                return true
            }
        },

        // Aldeia do próprio jogador
        function (target) {
            if (target.character_id === FarmOverflow.player.getId()) {
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
                var included = FarmOverflow.includedVillages.includes(target.id)

                if (!included) {
                    return true
                }   
            }
        },

        // Filtra aldeias pela pontuação
        function (target) {
            if (target.points < FarmOverflow.settings.minPoints) {
                return true
            }

            if (target.points > FarmOverflow.settings.maxPoints) {
                return true
            }
        },

        // Filtra aldeias pela distância
        function (target) {
            var coords = FarmOverflow.village.position
            var distance = $math.actualDistance(coords, target)

            if (distance < FarmOverflow.settings.minDistance) {
                return true
            }

            if (distance > FarmOverflow.settings.maxDistance) {
                return true
            }
        }
    ]

    /**
     * Obtem a lista de alvos para a aldeia selecionada.
     */
    FarmOverflow.getTargets = function (callback) {
        var coords = FarmOverflow.village.position
        var sid = FarmOverflow.village.id

        if (sid in FarmOverflow.targets) {
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
                FarmOverflow.trigger('startLoadingTargers')

                var loads = $convert.scaledGridCoordinates(x, y, w, h, chunk)
                var length = loads.length
                var index = 0

                $mapData.loadTownDataAsync(x, y, w, h, function () {
                    if (++index === length) {
                        FarmOverflow.trigger('endLoadingTargers')

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
            var pass = FarmOverflow.mapFilters.every(function (fn) {
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
                var hasVillages = FarmOverflow.nextVillage()

                if (hasVillages) {
                    FarmOverflow.getTargets(callback)
                } else {
                    FarmOverflow.trigger('noTargets')
                }

                return false
            }

            FarmOverflow.targets[sid] = filteredTargets.sort(function (a, b) {
                return a.distance - b.distance
            })

            if (FarmOverflow.indexes.hasOwnProperty(sid)) {
                if (FarmOverflow.indexes[sid] > FarmOverflow.targets[sid].length) {
                    FarmOverflow.indexes[sid] = 0

                    Lockr.set('farm-indexes', FarmOverflow.indexes)
                }
            } else {
                FarmOverflow.indexes[sid] = 0

                Lockr.set('farm-indexes', FarmOverflow.indexes)
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
    FarmOverflow.nextVillage = function () {
        if (FarmOverflow.singleVillage) {
            return false
        }

        var free = FarmOverflow.villages.filter(function (village) {
            return !FarmOverflow.waiting[village.id]
        })

        if (!free.length) {
            FarmOverflow.trigger('noVillages')
            return false
        } else if (free.length === 1) {
            FarmOverflow.village = free[0]
            FarmOverflow.trigger('nextVillage', [FarmOverflow.village])
            return true
        }

        var index = free.indexOf(FarmOverflow.village) + 1
        FarmOverflow.village = free[index] ? free[index] : free[0]
        
        FarmOverflow.trigger('nextVillage', [FarmOverflow.village])
        FarmOverflow.updateActivity()

        return true
    }

    /**
     * Seleciona uma aldeia específica do jogador.
     *
     * @param {Number} vid - ID da aldeia à ser selecionada.
     *
     * @return {Boolean}
     */
    FarmOverflow.selectVillage = function (vid) {
        var i = FarmOverflow.villages.indexOf(vid)

        if (i !== -1) {
            FarmOverflow.village = FarmOverflow.villages[i]

            return true
        }

        return false
    }

    /**
     * Chama os eventos.
     *
     * @param {String} event - Nome do evento.
     * @param {Array} args - Argumentos que serão passados no callback.
     */
    FarmOverflow.trigger = function (event, args) {
        if (!FarmOverflow.eventsEnabled) {
            return
        }

        if (FarmOverflow.eventListeners.hasOwnProperty(event)) {
            FarmOverflow.eventListeners[event].forEach(function (handler) {
                handler.apply(FarmOverflow, args)
            })
        }
    }

    /**
     * Registra um evento.
     *
     * @param {String} event - Nome do evento.
     * @param {Function} handler - Função chamada quando o evento for disparado.
     */
    FarmOverflow.bind = function (event, handler) {
        if (!FarmOverflow.eventListeners.hasOwnProperty(event)) {
            FarmOverflow.eventListeners[event] = []
        }

        FarmOverflow.eventListeners[event].push(handler)
    }

    /**
     * Obtem preset apropriado para o script
     *
     * @param {Function} callback
     */
    FarmOverflow.updatePresets = function (callback) {
        var updatePresets = function (presets) {
            FarmOverflow.presets = []

            if (!FarmOverflow.settings.presetName) {
                if (callback) {
                    callback()
                }

                return
            }

            for (var id in presets) {
                if (!presets.hasOwnProperty(id)) {
                    continue
                }

                var name = presets[id].name
                var cleanName = name.replace(rpreset, '').trim()

                if (cleanName === FarmOverflow.settings.presetName) {
                    presets[id].cleanName = cleanName
                    presets[id].units = cleanPresetUnits(presets[id].units)

                    FarmOverflow.presets.push(presets[id])
                }
            }

            if (callback) {
                callback()
            }
        }

        if ($presetList.isLoaded()) {
            updatePresets($presetList.presets)
        } else {
            $socket.emit($route.GET_PRESETS, {}, function (data) {
                FarmOverflow.trigger('presetsLoaded')
                updatePresets(data.presets)
            })
        }
    }

    /**
     * Ativa um lista de presets na aldeia selecionada.
     *
     * @param {Array} presetIds - Lista com os IDs dos presets
     * @param {Function} callback
     */
    FarmOverflow.assignPresets = function (presetIds, callback) {
        $socket.emit($route.ASSIGN_PRESETS, {
            village_id: FarmOverflow.village.id,
            preset_ids: presetIds
        }, callback)
    }

    /**
     * Verifica se aldeia tem os presets necessários ativados na aldeia
     * e ativa os que faltarem.
     *
     * @param {Array} presetIds - Lista com os IDs dos presets
     * @param {Function} callback
     */
    FarmOverflow.checkPresets = function (callback) {
        if (!FarmOverflow.presets.length) {
            FarmOverflow.stop()
            FarmOverflow.trigger('noPreset')

            return false
        }
        
        var vid = FarmOverflow.village.id
        var villagePresets = $presetList.getPresetsByVillageId(vid)
        var needAssign = false
        var which = []

        FarmOverflow.presets.forEach(function (preset) {
            if (!villagePresets.hasOwnProperty(preset.id)) {
                needAssign = true
                which.push(preset.id)
            }
        })

        if (needAssign) {
            for (var id in villagePresets) {
                which.push(id)
            }

            FarmOverflow.assignPresets(which, callback)
        } else {
            callback()
        }
    }

    /**
     * Atualiza o grupo de referência para ignorar aldeias e incluir alvos
     */
    FarmOverflow.updateExceptionGroups = function () {
        var types = ['groupIgnore', 'groupInclude', 'groupOnly']
        var groups = $model.getGroupList().getGroups()

        types.forEach(function (type) {
            FarmOverflow[type] = null

            for (var id in groups) {
                if (id == FarmOverflow.settings[type]) {
                    FarmOverflow[type] = {
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
    FarmOverflow.updateExceptionVillages = function () {
        var groupList = $model.getGroupList()

        FarmOverflow.ignoredVillages = []
        FarmOverflow.includedVillages = []

        if (FarmOverflow.groupIgnore) {
            FarmOverflow.ignoredVillages =
                groupList.getGroupVillageIds(FarmOverflow.groupIgnore.id)
        }

        if (FarmOverflow.groupInclude) {
            FarmOverflow.includedVillages =
                groupList.getGroupVillageIds(FarmOverflow.groupInclude.id)
        }
    }

    /**
     * Atualiza a lista de aldeias do jogador e filtra com base nos grupos (caso
     * estaja configurado...).
     */
    FarmOverflow.updatePlayerVillages = function () {
        var villages = FarmOverflow.player.getVillageList()

        villages = villages.map(function (village) {
            return new Village(village)
        })

        villages = villages.filter(function (village) {
            return !FarmOverflow.ignoredVillages.includes(village.id)
        })

        if (FarmOverflow.groupOnly) {
            var groupList = $model.getGroupList()
            var groupVillages = groupList.getGroupVillageIds(FarmOverflow.groupOnly.id)

            villages = villages.filter(function (village) {
                return groupVillages.includes(village.id)
            })
        }

        FarmOverflow.villages = villages
        FarmOverflow.singleVillage = FarmOverflow.villages.length === 1
        FarmOverflow.village = FarmOverflow.villages[0]

        // Reinicia comandos imediatamente se liberar alguma aldeia
        // que nao esteja na lista de espera.
        if (FarmOverflow.commander.running && FarmOverflow.globalWaiting) {
            for (var i = 0; i < villages.length; i++) {
                var village = villages[i]

                if (!FarmOverflow.waiting[village.id]) {
                    FarmOverflow.globalWaiting = false
                    FarmOverflow.commander.analyse()

                    break
                }
            }
        }

        FarmOverflow.trigger('villagesUpdate')
    }

    /**
     * Adiciona a aldeia especificada no grupo de aldeias ignoradas
     *
     * @param {Object} target - Dados da aldeia a ser ignorada.
     */
    FarmOverflow.ignoreVillage = function (target) {
        if (!FarmOverflow.groupIgnore) {
            return false
        }

        $socket.emit($route.GROUPS_LINK_VILLAGE, {
            group_id: FarmOverflow.groupIgnore.id,
            village_id: target.id
        }, function () {
            FarmOverflow.trigger('ignoredVillage', [target])
        })
    }

    /**
     * Verifica se o alvo está relacionado a alguma aldeia do jogador.
     *
     * @param {Number} targetId - ID da aldeia
     */
    FarmOverflow.targetExists = function (targetId) {
        for (var vid in FarmOverflow.targets) {
            var villageTargets = FarmOverflow.targets[vid]

            for (var i = 0; i < villageTargets.length; i++) {
                var target = villageTargets[i]

                if (target.id === targetId) {
                    return target
                }
            }
        }

        return false
    }

    /**
     * Detecta todas atualizações de dados do jogo que são importantes
     * para o funcionamento do FarmOverflow.
     */
    FarmOverflow.listeners = function () {
        function replyMessage (message_id, message) {
            setTimeout(function () {
                $socket.emit($route.MESSAGE_REPLY, {
                    message_id: message_id,
                    message: message
                })
            }, 300)
        }

        // Remove aldeias da lista de espera e detecta se todas as aldeias
        // estavam na lista de espera, reiniciando o ciclo de ataques.
        var commandBackHandler = function (event, data) {
            var vid = data.origin.id
            
            if (FarmOverflow.waiting[vid]) {
                delete FarmOverflow.waiting[vid]

                if (FarmOverflow.globalWaiting) {
                    FarmOverflow.globalWaiting = false

                    if (FarmOverflow.commander.running) {
                        FarmOverflow.selectVillage(vid)

                        setTimeout(function () {
                            FarmOverflow.commander.analyse()
                        }, 10000)
                    }
                }

                return false
            }
        }

        // Detecta alterações e atualiza lista de predefinições configuradas
        // no script.
        var updatePresets = function () {
            FarmOverflow.updatePresets()
            FarmOverflow.trigger('presetsChange')

            if (!FarmOverflow.presets.length) {
                if (FarmOverflow.commander.running) {
                    FarmOverflow.trigger('noPreset')
                    FarmOverflow.stop()
                }
            }
        }

        // Atualiza lista de grupos configurados no script.
        // Atualiza a lista de aldeias incluidas/ignoradas com base
        // nos grupos.
        var updateGroups = function (event, data) {
            FarmOverflow.updateExceptionGroups()
            FarmOverflow.updateExceptionVillages()

            FarmOverflow.trigger('groupsChanged')
        }

        // Detecta grupos que foram adicionados nas aldeias.
        // Atualiza a lista de alvos e aldeias do jogador.
        var updateGroupVillages = function (event, data) {
            FarmOverflow.updatePlayerVillages()

            if (!FarmOverflow.groupInclude) {
                return false
            }
            
            if (FarmOverflow.groupInclude.id === data.group_id) {
                FarmOverflow.targets = {}
            }
        }

        // Adiciona o grupo de "ignorados" no alvo caso o relatório do
        // ataque tenha causado alguma baixa nas tropas.
        var ignoreOnLoss = function (report) {
            var target = FarmOverflow.targetExists(report.target_village_id)

            if (!target) {
                return false
            }

            FarmOverflow.ignoreVillage(target)

            return true
        }

        // Adiciona alvos na lista de prioridades caso o relatório
        // do farm seja lotado.
        var priorityTargets = function (report) {
            var vid = report.attVillageId
            var tid = report.defVillageId

            FarmOverflow.priorityTargets[vid] = FarmOverflow.priorityTargets[vid] || []

            if (FarmOverflow.priorityTargets[vid].includes(tid)) {
                return false
            }

            FarmOverflow.priorityTargets[vid].push(tid)

            FarmOverflow.trigger('priorityTargetAdded', [{
                id: tid,
                name: report.defVillageName,
                x: report.defVillageX,
                y: report.defVillageY
            }])
        }

        // Analisa todos relatórios de ataques causados pelo FarmOverflow
        var reportHandler = function (event, data) {
            if (data.type !== 'attack') {
                return false
            }

            var queue = []

            // BATTLE_RESULTS = {
            //     '1'         : 'nocasualties',
            //     '2'         : 'casualties',
            //     '3'         : 'defeat'
            // }
            if (FarmOverflow.settings.ignoreOnLoss && data.result !== 1) {
                ignoreOnLoss(data)
            }

            // HAUL_TYPES = {
            //     'FULL'      : 'full',
            //     'PARTIAL'   : 'partial',
            //     'NONE'      : 'none'
            // }
            if (FarmOverflow.settings.priorityTargets && data.haul === 'full') {
                queue.push(priorityTargets)
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

        // Detecta quando a conexão é reestabelecida, podendo
        // reiniciar o script.
        var reconnectHandler = function (event, data) {
            if (FarmOverflow.commander.running) {
                setTimeout(function () {
                    FarmOverflow.disableNotifs(function () {
                        FarmOverflow.stop()
                        FarmOverflow.start()
                    })
                }, 3000)
            }
        }

        // Detecta mensagens do jogador enviadas para sí mesmo, afim de iniciar
        // e pausar o farm remotamente.
        var remoteHandler = function (event, data) {
            var id = FarmOverflow.settings.remoteId

            if (data.participants.length !== 1 || data.title !== id) {
                return false
            }

            var userMessage = data.message.content.trim().toLowerCase()

            switch (userMessage) {
            case 'on':
                FarmOverflow.disableNotifs(function () {
                    FarmOverflow.stop()
                    FarmOverflow.start()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                FarmOverflow.trigger('remoteCommand', ['on'])

                break
            case 'off':
                FarmOverflow.disableNotifs(function () {
                    FarmOverflow.stop()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                FarmOverflow.trigger('remoteCommand', ['off'])

                break
            case 'status':
                var village = FarmOverflow.village
                var villageLabel = village.name + ' (' + village.x + '|' + village.y + ')'
                var lastAttack = $filter('readableDateFilter')(FarmOverflow.lastAttack)

                var bbcodeMessage = [
                    '[b]' + FarmLocale('events.status') + ':[/b] ' + FarmLocale('events.' + FarmOverflow.status) + '[br]',
                    '[b]' + FarmLocale('events.selectedVillage') + ':[/b] ',
                    '[village=' + village.id + ']' + villageLabel + '[/village][br]',
                    '[b]' + FarmLocale('events.lastAttack') + ':[/b] ' + lastAttack
                ].join('')

                replyMessage(data.message_id, bbcodeMessage)
                FarmOverflow.trigger('remoteCommand', ['status'])

                break
            }

            return false
        }

        var bind = function (eventType, handler) {
            var unbind = $root.$on($eventType[eventType], handler)

            FarmOverflow.activeListeners.push(unbind)
        }

        bind('COMMAND_RETURNED', commandBackHandler)

        bind('ARMY_PRESET_UPDATE', updatePresets)
        bind('ARMY_PRESET_DELETED', updatePresets)

        bind('GROUPS_UPDATED', updateGroups)
        bind('GROUPS_CREATED', updateGroups)
        bind('GROUPS_DESTROYED', updateGroups)
        bind('GROUPS_VILLAGE_LINKED', updateGroupVillages)
        bind('GROUPS_VILLAGE_UNLINKED', updateGroupVillages)

        bind('REPORT_NEW', reportHandler)
        bind('RECONNECT', reconnectHandler)        
        bind('MESSAGE_SENT', remoteHandler)

        // Carrega pedaços da mapa quando chamado.
        // É disparado através do método .getTargets()
        $mapData.setRequestFn(function (args) {
            $socket.emit($route.MAP_GETVILLAGES, args)
        })

        // Lista de eventos para atualizar o último status do FarmOverflow.
        FarmOverflow.bind('sendCommand', function () {
            FarmOverflow.updateLastAttack()
            FarmOverflow.updateLastStatus('events.attacking')
        })

        FarmOverflow.bind('noPreset', function () {
            FarmOverflow.updateLastStatus('events.paused')
        })

        FarmOverflow.bind('noUnits', function () {
            FarmOverflow.updateLastStatus('events.noUnits')
        })

        FarmOverflow.bind('noUnitsNoCommands', function () {
            FarmOverflow.updateLastStatus('events.noUnitsNoCommands')
        })

        FarmOverflow.bind('start', function () {
            FarmOverflow.updateLastStatus('events.attacking')
        })

        FarmOverflow.bind('pause', function () {
            FarmOverflow.updateLastStatus('events.paused')
        })

        FarmOverflow.bind('startLoadingTargers', function () {
            FarmOverflow.updateLastStatus('events.loadingTargets')
        })

        FarmOverflow.bind('endLoadingTargers', function () {
            FarmOverflow.updateLastStatus('events.analyseTargets')
        })

        FarmOverflow.bind('commandLimitSingle', function () {
            FarmOverflow.updateLastStatus('events.commandLimit')
        })

        FarmOverflow.bind('commandLimitMulti', function () {
            FarmOverflow.updateLastStatus('events.noVillages')
        })
    }

    FarmOverflow.targetsLoaded = function () {
        return FarmOverflow.targets.hasOwnProperty(FarmOverflow.village.id)
    }

    FarmOverflow.hasVillage = function () {
        return !!FarmOverflow.village
    }

    FarmOverflow.isWaiting = function () {
        return FarmOverflow.waiting.hasOwnProperty(FarmOverflow.village.id)
    }

    FarmOverflow.isIgnored = function () {
        return FarmOverflow.ignoredVillages.includes(FarmOverflow.village.id)
    }

    FarmOverflow.isAllWaiting = function () {
        for (var i = 0; i < FarmOverflow.villages.length; i++) {
            var vid = FarmOverflow.villages[i].id

            if (!FarmOverflow.waiting.hasOwnProperty(vid)) {
                return false
            }
        }

        return true
    }

    return FarmOverflow
})
