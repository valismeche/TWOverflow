define('FarmOverflow/Farm', [
    'FarmOverflow/Commander',
    'FarmOverflow/analytics',
    'FarmOverflow/Village',
    'helper/math',
    'conf/conf',
    'struct/MapData',
    'helper/mapconvert',
    'helper/time',
    'conf/locale'
], function (
    Commander,
    analytics,
    Village,
    $math,
    $conf,
    $mapData,
    $convert,
    $timeHelper,
    gameLocale
) {
    /**
     * Tempo de validade dos índices dos alvos, é resetado quando o
     * FarmOverflow está pausado por mais de 30 minutos.
     *
     * @type {Number}
     */
    const INDEX_EXPIRE_TIME = 1000 * 60 * 30

    /**
     * Tempo de validade dos alvos adicionados nas prioridades após o script
     * ser parado.
     *
     * @type {Number}
     */
    const PRIORITY_EXPIRE_TIME = 1000 * 60 * 10

    /**
     * Mesangem de retorno quando o farm é iniciado/pausado remotamente
     * via mensagem.
     *
     * @type {String}
     */
    const REMOTE_SWITCH_RESPONSE = '[color=0a8028]OK[/color]'

    /**
     * @class
     */
    function FarmOverflow () {
        let DEFAULTS = {
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
            language: '',
            priorityTargets: true,
            eventAttack: true,
            eventVillageChange: true,
            eventPriorityAdd: true,
            eventIgnoredVillage: true,
            remoteId: 'remote',
            hotkeySwitch: 'shift+z',
            hotkeyWindow: 'z'
        }

        let localSettings = Lockr.get('settings', {}, true)

        /**
         * Obtem configurações locais.
         *
         * @type {Object}
         */
        this.settings = angular.merge({}, DEFAULTS, localSettings)

        /**
         * Versão do script.
         *
         * @type {String}
         */
        this.version = '___version'

        /**
         * Objeto com dados do jogador.
         *
         * @type {Object}
         */
        this.player = $model.getSelectedCharacter()

        /**
         * Aldeias que prontas para serem usadas nos ataques.
         *
         * @type {Array}
         */
        this.villages = null

        /**
         * Aldeia atualmente selecionada.
         *
         * @type {Object} VillageModel
         */
        this.village = null

        /**
         * Identifica se o jogador possui apenas uma aldeia disponível para atacar.
         *
         * @type {Boolean}
         */
        this.singleVillage = null

        /**
         * Lista de todos aldeias alvos possíveis para cada aldeia do jogador.
         *
         * @type {Object}
         */
        this.targets = {}

        /**
         * Aldeias alvo atualmente selecionada.
         *
         * @type {Object}
         */
        this.target = null

        /**
         * Callbacks usados pelos eventos que são disparados no decorrer do script.
         *
         * @type {Object}
         */
        this.eventListeners = {}

        /**
         * Propriedade usada para permitir ou não o disparo de eventos.
         *
         * @type {Boolean}
         */
        this.eventsEnabled = true

        /**
         * Propriedade usada para permitir ou não a exibição de notificações.
         *
         * @type {Boolean}
         */
        this.notifsEnabled = true

        /**
         * Preset usado como referência para enviar os comandos
         *
         * @type {Array}
         */
        this.presets = []

        /**
         * Objeto do group de referência para ignorar aldeias/alvos.
         *
         * @type {Object}
         */
        this.groupIgnore = null

        /**
         * Objeto do group de referência para incluir alvos.
         *
         * @type {Object}
         */
        this.groupInclude = null

        /**
         * Objeto do group de referência para filtrar aldeias usadas
         * pelo FarmOverflow.
         *
         * @type {Object}
         */
        this.groupOnly = null

        /**
         * Lista de aldeias ignoradas
         *
         * @type {Array}
         */
        this.ignoredVillages = []

        /**
         * Lista de aldeias que serão permitidas atacar, independente de outros
         * fatores a não ser a distância.
         *
         * @type {Array}
         */
        this.includedVillages = []

        /**
         * Armazena os índices dos alvos de cada aldeia disponível.
         *
         * @type {Object}
         */
        this.indexes = Lockr.get('indexes', {}, true)

        /**
         * Armazena todas aldeias que não estão em confições de enviar comandos.
         *
         * @type {Object}
         */
        this.waiting = {}

        /**
         * Indica se não há nenhuma aldeia disponível (todas aguardando tropas).
         *
         * @type {Boolean}
         */
        this.globalWaiting = false

        /**
         * Armazena o último evento que fez o farm entrar em modo de espera.
         * Usado para atualizar a mensagem de status quando o farm é reiniciado
         * manualmente.
         *
         * @type {String}
         */
        this.lastError = ''

        /**
         * Classe que controla os ciclos de ataques.
         *
         * @type {FarmOverflowCommander}
         */
        this.commander = new Commander(this)

        /**
         * Lista de alvos com prioridade no envio dos ataques.
         * Alvos são adicionados nessa lista quando farms voltam lotados.
         *
         * @type {Object.<array>}
         */
        this.priorityTargets = {}

        /**
         * Lista com todas funções "unbind" dos listeners $on.
         *
         * @type {Array}
         */
        this.activeListeners = []

        /**
         * Timestamp da última atividade do FarmOverflow como atques e
         * trocas de aldeias.
         *
         * @type {Number}
         */
        this.lastActivity = Lockr.get('lastActivity', $timeHelper.gameTime(), true)

        /**
         * Timestamp da última atividade do FarmOverflow como atques e
         * trocas de aldeias.
         *
         * @type {Number}
         */
        this.lastAttack = Lockr.get('lastAttack', -1, true)

        this.updateExceptionGroups()
        this.updateExceptionVillages()
        this.updatePlayerVillages()
        this.updatePresets()
        this.languages()
        this.listeners()

        /**
         * Status do FarmOverflow.
         *
         * @type {String}
         */
        this.status = this.lang.events.paused

        return this
    }

    /**
     * Inicia os comandos.
     *
     * @return {Boolean}
     */
    FarmOverflow.prototype.start = function () {
        if (!this.presets.length) {
            return this.notif('error', this.lang.events.presetFirst)
        }

        if (!this.village) {
            return this.notif('error', this.lang.events.noSelectedVillage)
        }

        let now = $timeHelper.gameTime()

        // Reseta a lista prioridades caso tenha expirado
        if (now > this.lastActivity + PRIORITY_EXPIRE_TIME) {
            this.priorityTargets = {}
        }

        // Reseta a lista índices caso tenha expirado
        if (now > this.lastActivity + INDEX_EXPIRE_TIME) {
            this.indexes = {}
            Lockr.set('indexes', {})
        }

        this.commander = new Commander(this)
        this.commander.start()

        this.notif('success', this.lang.general.started)

        analytics.start()

        return true
    }

    /**
     * Pausa os comandos.
     *
     * @return {Boolean}
     */
    FarmOverflow.prototype.stop = function () {
        this.commander.stop()

        this.notif('success', this.lang.general.paused)

        analytics.pause()

        return true
    }

    /**
     * Alterna entre iniciar e pausar o script.
     */
    FarmOverflow.prototype.switch = function () {
        if (this.commander && this.commander.running) {
            this.stop()
        } else {
            this.start()
        }
    }

    /**
     * Emite notificação nativa do jogo.
     *
     * @param {String} type - success || error
     * @param {String} message - Texto a ser exibido
     */
    FarmOverflow.prototype.notif = function (type, message) {
        if (!this.notifsEnabled) {
            return false
        }

        let eventType = type === 'success'
            ? $eventType.MESSAGE_SUCCESS
            : $eventType.MESSAGE_ERROR

        $root.$broadcast(eventType, {
            message: message
        })
    }

    /**
     * Atualiza o timestamp da última atividade do FarmOverflow.
     */
    FarmOverflow.prototype.updateActivity = function () {
        this.lastActivity = $timeHelper.gameTime()
        Lockr.set('lastActivity', this.lastActivity)
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o FarmOverflow.
     */
    FarmOverflow.prototype.updateLastAttack = function () {
        this.lastAttack = $timeHelper.gameTime()
        Lockr.set('lastAttack', this.lastAttack)
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o FarmOverflow.
     */
    FarmOverflow.prototype.updateLastStatus = function (status) {
        this.status = status
    }

    /**
     * Atualiza as novas configurações passados pelo usuário e as fazem
     * ter efeito caso o farm esteja em funcionamento.
     *
     * @param {Object} changes - Novas configurações.
     */
    FarmOverflow.prototype.updateSettings = function (changes) {
        let modify = {}

        // Valores que precisam ser resetados/modificados quando
        // configuração x é alterada.
        let updates = {
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
            eventIgnoredVillage: ['events']
        }

        for (let key in changes) {
            if (changes[key] !== this.settings[key]) {
                let modifyKeys = updates[key]

                if (updates.hasOwnProperty(key)) {
                    for (let i = 0; i < modifyKeys.length; i++) {
                        modify[modifyKeys[i]] = true
                    }
                }
            }

            this.settings[key] = changes[key]
        }

        Lockr.set('settings', this.settings)

        // Nenhuma alteração nas configurações
        if (angular.equals(modify, {})) {
            return false
        }

        if (modify.groups) {
            this.updateExceptionGroups()
            this.updateExceptionVillages()
        }

        if (modify.villages) {
            this.updatePlayerVillages()
        }

        if (modify.preset) {
            this.updatePresets()
        }

        if (modify.targets) {
            this.targets = {}
        }

        if (modify.events) {
            this.event('resetEvents')
        }

        if (this.commander.running && this.globalWaiting) {
            this.disableEvents(() => {
                this.stop()
                this.start()
            })
        }

        analytics.settingsChange(localStorage[Lockr.prefix + 'settings'])
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    FarmOverflow.prototype.disableEvents = function (callback) {
        this.eventsEnabled = false
        callback()
        this.eventsEnabled = true
    }

    /**
     * Desativa o disparo de eventos temporariamente.
     */
    FarmOverflow.prototype.disableNotifs = function (callback) {
        this.notifsEnabled = false
        callback()
        this.notifsEnabled = true
    }

    /** 
     * Seleciona o próximo alvo da aldeia.
     *
     * @param [_selectOnly] Apenas seleciona o alvo sem pular para o próximo.
     */
    FarmOverflow.prototype.nextTarget = function (_selectOnly) {
        let sid = this.village.id

        // Caso a lista de alvos seja resetada no meio da execução.
        if (!this.targets[sid]) {
            this.commander.analyse()

            return false
        }

        let villageTargets = this.targets[sid]

        if (this.settings.priorityTargets && this.priorityTargets[sid]) {
            let priorityId

            while (priorityId = this.priorityTargets[sid].shift()) {
                if (this.ignoredVillages.includes(priorityId)) {
                    continue
                }

                for (let i = 0; i < villageTargets.length; i++) {
                    if (villageTargets[i].id === priorityId) {
                        this.target = villageTargets[i]
                        return true
                    }
                }
            }
        }

        let index = this.indexes[sid]
        let changed = false

        if (!_selectOnly) {
            index = ++this.indexes[sid]
        }

        for (; index < villageTargets.length; index++) {
            let target = villageTargets[index]

            if (this.ignoredVillages.includes(target.id)) {
                this.event('ignoredTarget', [target])

                continue
            }

            this.target = target
            changed = true

            break
        }

        if (changed) {
            this.indexes[sid] = index
        } else {
            this.target = villageTargets[0]
            this.indexes[sid] = 0
        }

        Lockr.set('indexes', this.indexes)

        return true
    }

    /** 
     * Atalho para selecionar alvo sem pular para o próximo.
     */
    FarmOverflow.prototype.selectTarget = function () {
        return this.nextTarget(true)
    }

    /**
     * Verifica se a aldeia selecionada possui alvos e se tiver, atualiza
     * o objecto do alvo e o índice.
     */
    FarmOverflow.prototype.hasTarget = function () {
        let sid = this.village.id
        let index = this.indexes[sid]
        let targets = this.targets[sid]

        if (!targets.length) {
            return false
        }

        // Verifica se tem alvos e se o índice selecionado possui alvo.
        // Pode acontecer quando o numero de alvos é reduzido em um
        // momento em que o FarmOverflow não esteja ativado.
        if (index > targets.length) {
            this.indexes[sid] = index = 0
        }

        return !!targets[index]
    }

    /**
     * Lista de filtros chamados no momendo do carregamento de alvos do mapa.
     */
    FarmOverflow.mapFilters = [
        // IDs negativos são localizações reservadas para os jogadores como
        // segunda aldeia em construção, convidar um amigo e deposito de recursos.
        function (scope, target) {
            if (target.id < 0) {
                return true
            }
        },

        // Aldeia do próprio jogador
        function (scope, target) {
            if (target.character_id === scope.player.getId()) {
                return true
            }
        },

        // Impossivel atacar alvos protegidos
        function (scope, target) {
            if (target.attack_protection) {
                return true
            }
        },

        // Aldeias de jogadores são permitidas caso estejam
        // no grupo de incluidas.
        function (scope, target) {
            if (target.character_id) {
                let included = scope.includedVillages.includes(target.id)

                if (!included) {
                    return true
                }   
            }
        },

        // Filtra aldeias pela pontuação
        function (scope, target) {
            if (target.points < scope.settings.minPoints) {
                return true
            }

            if (target.points > scope.settings.maxPoints) {
                return true
            }
        },

        // Filtra aldeias pela distância
        function (scope, target) {
            let coords = scope.village.position
            let distance = $math.actualDistance(coords, target)

            if (distance < scope.settings.minDistance) {
                return true
            }

            if (distance > scope.settings.maxDistance) {
                return true
            }
        }
    ]

    /**
     * Obtem a lista de alvos para a aldeia selecionada.
     */
    FarmOverflow.prototype.getTargets = function (callback) {
        let coords = this.village.position
        let sid = this.village.id

        if (sid in this.targets) {
            return callback()
        }

        let filteredTargets = []

        // Carregando 25 campos a mais para preencher alguns setores
        // que não são carregados quando a aldeia se encontra na borda.
        let chunk = $conf.MAP_CHUNK_SIZE
        let x = coords.x - chunk
        let y = coords.y - chunk
        let w = chunk * 2
        let h = chunk * 2

        let load = () => {
            let loaded = $mapData.hasTownDataInChunk(x, y)

            if (loaded) {
                loop()
            } else {
                this.event('startLoadingTargers')

                let loads = $convert.scaledGridCoordinates(x, y, w, h, chunk)
                let length = loads.length
                let index = 0

                $mapData.loadTownDataAsync(x, y, w, h, () => {
                    if (++index === length) {
                        this.event('endLoadingTargers')

                        loop()
                    }
                })
            }

            return 
        }

        let loop = () => {
            let sectors = $mapData.loadTownData(x, y, w, h, chunk)
            let i = sectors.length

            while (i--) {
                let sector = sectors[i]
                let sectorDataX = sector.data

                for (let x in sectorDataX) {
                    let sectorDataY = sectorDataX[x]

                    for (let y in sectorDataY) {
                        let village = sectorDataY[y]
                        let pass = filter(village)

                        if (pass) {
                            filteredTargets.push(pass)
                        }
                    }
                }
            }

            done()
        }

        let filter = (target) => {
            let pass = FarmOverflow.mapFilters.every((fn) => {
                return !fn(this, target)
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

        let done = () => {
            if (filteredTargets.length === 0) {
                let hasVillages = this.nextVillage()

                if (hasVillages) {
                    this.getTargets(callback)
                } else {
                    this.event('noTargets')
                }

                return false
            }

            this.targets[sid] = filteredTargets.sort(function (a, b) {
                return a.distance - b.distance
            })

            if (this.indexes.hasOwnProperty(sid)) {
                if (this.indexes[sid] > this.targets[sid].length) {
                    this.indexes[sid] = 0

                    Lockr.set('indexes', this.indexes)
                }
            } else {
                this.indexes[sid] = 0

                Lockr.set('indexes', this.indexes)
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
    FarmOverflow.prototype.nextVillage = function () {
        if (this.singleVillage) {
            return false
        }

        let free = this.villages.filter((village) => {
            return !this.waiting[village.id]
        })

        if (!free.length) {
            this.event('noVillages')
            return false
        } else if (free.length === 1) {
            this.village = free[0]
            this.event('nextVillage', [this.village])
            return true
        }

        let index = free.indexOf(this.village) + 1
        this.village = free[index] ? free[index] : free[0]
        
        this.event('nextVillage', [this.village])

        this.updateActivity()

        return true
    }

    /**
     * Seleciona uma aldeia específica do jogador.
     *
     * @param {Number} vid - ID da aldeia à ser selecionada.
     *
     * @return {Boolean}
     */
    FarmOverflow.prototype.selectVillage = function (vid) {
        let i = this.villages.indexOf(vid)

        if (i !== -1) {
            this.village = this.villages[i]

            return true
        }

        return false
    }

    /**
     * Chama os eventos.
     *
     * @param {String} - Nome do evento.
     * @param {Array} data - Argumentos que serão passados no callback.
     */
    FarmOverflow.prototype.event = function (type, data) {
        if (!this.eventsEnabled) {
            return this
        }

        if (type in this.eventListeners) {
            let listeners = this.eventListeners[type]

            for (let i = 0; i < listeners.length; i++) {
                listeners[i].apply(this, data)
            }
        }

        return this
    }

    /**
     * Registra um evento.
     *
     * @param {String} type - Nome do evento.
     * @param {Function} handler - Função chamada quando o evento for disparado.
     */
    FarmOverflow.prototype.on = function (type, handler) {
        if (typeof handler === 'function') {
            if (!(type in this.eventListeners)) {
                this.eventListeners[type] = []
            }

            this.eventListeners[type].push(handler)
        }

        return this
    }

    /**
     * Obtem preset apropriado para o script
     *
     * @param {Function} callback
     */
    FarmOverflow.prototype.updatePresets = function (callback) {
        let updatePresets = (presets) => {
            this.presets = []

            if (!this.settings.presetName) {
                if (callback) {
                    callback()
                }

                return
            }

            for (let id in presets) {
                if (!presets.hasOwnProperty(id)) {
                    continue
                }

                let name = presets[id].name
                let cleanName = name.replace(rpreset, '').trim()

                if (cleanName === this.settings.presetName) {
                    presets[id].cleanName = cleanName
                    presets[id].units = cleanPresetUnits(presets[id].units)

                    this.presets.push(presets[id])
                }
            }

            if (callback) {
                callback()
            }
        }

        if ($presetList.isLoaded()) {
            updatePresets($presetList.presets)
        } else {
            $socket.emit($route.GET_PRESETS, {}, (data) => {
                this.event('presetsLoaded')
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
    FarmOverflow.prototype.assignPresets = function (presetIds, callback) {
        $socket.emit($route.ASSIGN_PRESETS, {
            village_id: this.village.id,
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
    FarmOverflow.prototype.checkPresets = function (callback) {
        if (!this.presets.length) {
            this.stop()
            this.event('noPreset')

            return false
        }
        
        let vid = this.village.id
        let villagePresets = $presetList.getPresetsByVillageId(vid)
        let needAssign = false
        let which = []

        for (let preset of this.presets) {
            if (!villagePresets.hasOwnProperty(preset.id)) {
                needAssign = true
                which.push(preset.id)
            }
        }

        if (needAssign) {
            for (let id in villagePresets) {
                which.push(id)
            }

            this.assignPresets(which, callback)
        } else {
            callback()
        }
    }

    /**
     * Atualiza o grupo de referência para ignorar aldeias e incluir alvos
     */
    FarmOverflow.prototype.updateExceptionGroups = function () {
        let types = ['groupIgnore', 'groupInclude', 'groupOnly']
        let groups = $model.getGroupList().getGroups()

        for (let type of types) {
            this[type] = null

            for (let id in groups) {
                if (id == this.settings[type]) {
                    this[type] = {
                        name: groups[id].name,
                        id: id
                    }

                    break
                }
            }
        }
    }

    /**
     * Atualiza a lista de aldeias ignoradas e incluidas
     */
    FarmOverflow.prototype.updateExceptionVillages = function () {
        let groupList = $model.getGroupList()

        this.ignoredVillages = []
        this.includedVillages = []

        if (this.groupIgnore) {
            this.ignoredVillages =
                groupList.getGroupVillageIds(this.groupIgnore.id)
        }

        if (this.groupInclude) {
            this.includedVillages =
                groupList.getGroupVillageIds(this.groupInclude.id)
        }
    }

    /**
     * Atualiza a lista de aldeias do jogador e filtra com base nos grupos (caso
     * estaja configurado...).
     */
    FarmOverflow.prototype.updatePlayerVillages = function () {
        let villages = this.player.getVillageList()

        villages = villages.map((village) => {
            return new Village(village)
        })

        villages = villages.filter((village) => {
            return !this.ignoredVillages.includes(village.id)
        })

        if (this.groupOnly) {
            let groupList = $model.getGroupList()
            let groupVillages = groupList.getGroupVillageIds(this.groupOnly.id)

            villages = villages.filter((village) => {
                return groupVillages.includes(village.id)
            })
        }

        this.villages = villages
        this.singleVillage = this.villages.length === 1
        this.village = this.villages[0]

        // Reinicia comandos imediatamente se liberar alguma aldeia
        // que nao esteja na lista de espera.
        if (this.commander.running && this.globalWaiting) {
            for (let i = 0; i < villages.length; i++) {
                let village = villages[i]

                if (!this.waiting[village.id]) {
                    this.globalWaiting = false
                    this.commander.analyse()

                    break
                }
            }
        }

        this.event('villagesUpdate')
    }

    /**
     * Adiciona a aldeia especificada no grupo de aldeias ignoradas
     *
     * @param {Object} target - Dados da aldeia a ser ignorada.
     */
    FarmOverflow.prototype.ignoreVillage = function (target) {
        if (!this.groupIgnore) {
            return false
        }

        $socket.emit($route.GROUPS_LINK_VILLAGE, {
            group_id: this.groupIgnore.id,
            village_id: target.id
        }, () => {
            this.event('ignoredVillage', [target])
        })
    }

    /**
     * Verifica se o alvo está relacionado a alguma aldeia do jogador.
     *
     * @param {Number} targetId - ID da aldeia
     */
    FarmOverflow.prototype.targetExists = function (targetId) {
        for (let vid in this.targets) {
            let villageTargets = this.targets[vid]

            for (let i = 0; i < villageTargets.length; i++) {
                let target = villageTargets[i]

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
    FarmOverflow.prototype.listeners = function () {
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
        let commandBackHandler = (event, data) => {
            let vid = data.origin.id
            
            if (this.waiting[vid]) {
                delete this.waiting[vid]

                if (this.globalWaiting) {
                    this.globalWaiting = false

                    if (this.commander.running) {
                        this.selectVillage(vid)

                        setTimeout(() => {
                            this.commander.analyse()
                        }, 10000)
                    }
                }

                return false
            }
        }

        // Detecta alterações e atualiza lista de predefinições configuradas
        // no script.
        let updatePresets = () => {
            this.updatePresets()
            this.event('presetsChange')

            if (!this.presets.length) {
                if (this.commander.running) {
                    this.event('noPreset')
                    this.stop()
                }
            }
        }

        // Atualiza lista de grupos configurados no script.
        // Atualiza a lista de aldeias incluidas/ignoradas com base
        // nos grupos.
        let updateGroups = (event, data) => {
            this.updateExceptionGroups()
            this.updateExceptionVillages()

            this.event('groupsChanged')
        }

        // Detecta grupos que foram adicionados nas aldeias.
        // Atualiza a lista de alvos e aldeias do jogador.
        let updateGroupVillages = (event, data) => {
            this.updatePlayerVillages()

            if (!this.groupInclude) {
                return false
            }
            
            if (this.groupInclude.id === data.group_id) {
                this.targets = {}
            }
        }

        // Adiciona o grupo de "ignorados" no alvo caso o relatório do
        // ataque tenha causado alguma baixa nas tropas.
        let ignoreOnLoss = (report) => {
            let target = this.targetExists(report.target_village_id)

            if (!target) {
                return false
            }

            this.ignoreVillage(target)
            analytics.ignoreTarget()

            return true
        }

        // Adiciona alvos na lista de prioridades caso o relatório
        // do farm seja lotado.
        let priorityTargets = (report) => {
            let vid = report.attVillageId
            let tid = report.defVillageId

            this.priorityTargets[vid] = this.priorityTargets[vid] || []

            if (this.priorityTargets[vid].includes(tid)) {
                return false
            }

            this.priorityTargets[vid].push(tid)

            analytics.priorityTarget()

            this.event('priorityTargetAdded', [{
                id: tid,
                name: report.defVillageName,
                x: report.defVillageX,
                y: report.defVillageY
            }])
        }

        // Analisa todos relatórios de ataques causados pelo FarmOverflow
        let reportHandler = (event, data) => {
            if (data.type !== 'attack') {
                return false
            }

            let queue = []

            // BATTLE_RESULTS = {
            //     '1'         : 'nocasualties',
            //     '2'         : 'casualties',
            //     '3'         : 'defeat'
            // }
            if (this.settings.ignoreOnLoss && data.result !== 1) {
                ignoreOnLoss(data)
            }

            // HAUL_TYPES = {
            //     'FULL'      : 'full',
            //     'PARTIAL'   : 'partial',
            //     'NONE'      : 'none'
            // }
            if (this.settings.priorityTargets && data.haul === 'full') {
                queue.push(priorityTargets)
            }

            if (!queue.length) {
                return false
            }

            $socket.emit($route.REPORT_GET, {
                id: data.id
            }, (data) => {
                // Manter o relatório marcado como "Novo"
                $socket.emit($route.REPORT_MARK_UNREAD, {
                    reports: [data.id]
                }, function () {})

                let report = data.ReportAttack

                queue.every(function (handler) {
                    handler(report)
                })
            })
        }

        // Detecta quando a conexão é reestabelecida, podendo
        // reiniciar o script.
        let reconnectHandler = (event, data) => {
            if (this.commander.running) {
                setTimeout(() => {
                    this.disableNotifs(() => {
                        this.stop()
                        this.start()
                    })
                }, 3000)
            }
        }

        // Detecta mensagens do jogador enviadas para sí mesmo, afim de iniciar
        // e pausar o farm remotamente.
        let remoteHandler = (event, data) => {
            let id = this.settings.remoteId

            if (data.participants.length !== 1 || data.title !== id) {
                return false
            }

            let userMessage = data.message.content.trim().toLowerCase()

            switch (userMessage) {
            case 'on':
                this.disableNotifs(() => {
                    this.stop()
                    this.start()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                analytics.remoteCommand()

                break
            case 'off':
                this.disableNotifs(() => {
                    this.stop()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                analytics.remoteCommand()

                break
            case 'status':
                let village = this.village
                let villageLabel = `${village.name} (${village.x}|${village.y})`
                let lastAttack = $filter('readableDateFilter')(this.lastAttack)

                let bbcodeMessage = [
                    `[b]${this.lang.events.status}:[/b] ${this.status}[br]`,
                    `[b]${this.lang.events.selectedVillage}:[/b] `,
                    `[village=${village.id}]${villageLabel}[/village][br]`,
                    `[b]${this.lang.events.lastAttack}:[/b] ${lastAttack}`
                ].join('')

                replyMessage(data.message_id, bbcodeMessage)
                analytics.remoteCommand()

                break
            }

            return false
        }

        let bind = (eventType, handler) => {
            let unbind = $root.$on($eventType[eventType], handler)

            this.activeListeners.push(unbind)
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

        let events = this.lang.events

        // Lista de eventos para atualizar o último status do FarmOverflow.
        this.on('sendCommand', () => {
            this.updateLastAttack()
            this.updateLastStatus(events.attacking)
        })
        this.on('noPreset', () => this.updateLastStatus(events.paused))
        this.on('noUnits', () => this.updateLastStatus(events.noUnits))
        this.on('noUnitsNoCommands', () => this.updateLastStatus(events.noUnitsNoCommands))
        this.on('start', () => this.updateLastStatus(events.attacking))
        this.on('pause', () => this.updateLastStatus(events.paused))
        this.on('startLoadingTargers', () => this.updateLastStatus(events.loadingTargets))
        this.on('endLoadingTargers', () => this.updateLastStatus(events.analyseTargets))
        this.on('commandLimitSingle', () => this.updateLastStatus(events.commandLimit))
        this.on('commandLimitMulti', () => this.updateLastStatus(events.noVillages))
    }

    FarmOverflow.prototype.targetsLoaded = function () {
        return this.targets.hasOwnProperty(this.village.id)
    }

    FarmOverflow.prototype.hasVillage = function () {
        return !!this.village
    }

    FarmOverflow.prototype.isWaiting = function () {
        return this.waiting.hasOwnProperty(this.village.id)
    }

    FarmOverflow.prototype.isIgnored = function () {
        return this.ignoredVillages.includes(this.village.id)
    }

    FarmOverflow.prototype.isAllWaiting = function () {
        for (let i = 0; i < this.villages.length; i++) {
            let vid = this.villages[i].id

            if (!this.waiting.hasOwnProperty(vid)) {
                return false
            }
        }

        return true
    }

    /**
     * Define a linguagem da interface
     */
    FarmOverflow.prototype.languages = function () {
        let i18n = {
            pt_br: ___langPt_br,
            en_us: ___langEn_us
        }

        let gameLang = gameLocale.LANGUAGE

        let aliases = {
            'pt_pt': 'pt_br',
            'en_dk': 'en_us'
        }

        if (gameLang in aliases) {
            gameLang = aliases[gameLang]
        }

        if (this.settings.language) {
            this.lang = i18n[this.settings.language]
        } else {
            let lang = gameLang in i18n ? gameLang : 'en_us'
            this.lang = i18n[lang]
            this.settings.language = lang
        }
    }

    return FarmOverflow
})
