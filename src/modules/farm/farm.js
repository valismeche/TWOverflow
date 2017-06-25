define('FarmOverflow/Farm', [
    'FarmOverflow/Farm/Commander',
    'FarmOverflow/Farm/Village',
    'helper/math',
    'conf/conf',
    'struct/MapData',
    'helper/mapconvert',
    'helper/time',
    'conf/locale'
], function (
    Commander,
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
     * @class
     */
    function FarmOverflow () {
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

        var localSettings = Lockr.get('farm-settings', {}, true)

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
        this.version = '___farmOverlflowVersion'

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
        this.indexes = Lockr.get('farm-indexes', {}, true)

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
        this.lastActivity = Lockr.get('farm-lastActivity', $timeHelper.gameTime(), true)

        /**
         * Timestamp da última atividade do FarmOverflow como atques e
         * trocas de aldeias.
         *
         * @type {Number}
         */
        this.lastAttack = Lockr.get('farm-lastAttack', -1, true)

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
            if (this.notifsEnabled) {
                emitNotif('error', this.lang.events.presetFirst)
            }

            return false
        }

        if (!this.village) {
            if (this.notifsEnabled) {
                emitNotif('error', this.lang.events.noSelectedVillage)
            }
            
            return false
        }

        var now = $timeHelper.gameTime()

        // Reseta a lista prioridades caso tenha expirado
        if (now > this.lastActivity + PRIORITY_EXPIRE_TIME) {
            this.priorityTargets = {}
        }

        // Reseta a lista índices caso tenha expirado
        if (now > this.lastActivity + INDEX_EXPIRE_TIME) {
            this.indexes = {}
            Lockr.set('farm-indexes', {})
        }

        this.commander = new Commander(this)
        this.commander.start()

        if (this.notifsEnabled) {
            emitNotif('success', this.lang.general.started)
        }

        this.event('start')

        return true
    }

    /**
     * Pausa os comandos.
     *
     * @return {Boolean}
     */
    FarmOverflow.prototype.stop = function () {
        this.commander.stop()
        
        if (this.notifsEnabled) {
            emitNotif('success', this.lang.general.paused)
        }

        this.event('pause')

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
     * Atualiza o timestamp da última atividade do FarmOverflow.
     */
    FarmOverflow.prototype.updateActivity = function () {
        this.lastActivity = $timeHelper.gameTime()
        Lockr.set('farm-lastActivity', this.lastActivity)
    }

    /**
     * Atualiza o timestamp do último ataque enviado com o FarmOverflow.
     */
    FarmOverflow.prototype.updateLastAttack = function () {
        this.lastAttack = $timeHelper.gameTime()
        Lockr.set('farm-lastAttack', this.lastAttack)
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
        var self = this
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
            eventIgnoredVillage: ['events']
        }

        for (var key in changes) {
            if (changes[key] !== self.settings[key]) {
                var modifyKeys = updates[key]

                if (updates.hasOwnProperty(key)) {
                    for (var i = 0; i < modifyKeys.length; i++) {
                        modify[modifyKeys[i]] = true
                    }
                }
            }

            self.settings[key] = changes[key]
        }

        Lockr.set('farm-settings', self.settings)

        // Nenhuma alteração nas configurações
        if (angular.equals(modify, {})) {
            return false
        }

        if (modify.groups) {
            self.updateExceptionGroups()
            self.updateExceptionVillages()
        }

        if (modify.villages) {
            self.updatePlayerVillages()
        }

        if (modify.preset) {
            self.updatePresets()
        }

        if (modify.targets) {
            self.targets = {}
        }

        if (modify.events) {
            self.event('resetEvents')
        }

        if (self.commander.running && self.globalWaiting) {
            self.disableEvents(function () {
                self.stop()
                self.start()
            })
        }

        self.event('settingsChange', [Lockr.get('farm-settings')])
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
        var sid = this.village.id

        // Caso a lista de alvos seja resetada no meio da execução.
        if (!this.targets[sid]) {
            this.commander.analyse()

            return false
        }

        var villageTargets = this.targets[sid]

        if (this.settings.priorityTargets && this.priorityTargets[sid]) {
            var priorityId

            while (priorityId = this.priorityTargets[sid].shift()) {
                if (this.ignoredVillages.includes(priorityId)) {
                    continue
                }

                for (var i = 0; i < villageTargets.length; i++) {
                    if (villageTargets[i].id === priorityId) {
                        this.target = villageTargets[i]
                        return true
                    }
                }
            }
        }

        var index = this.indexes[sid]
        var changed = false

        if (!_selectOnly) {
            index = ++this.indexes[sid]
        }

        for (; index < villageTargets.length; index++) {
            var target = villageTargets[index]

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

        Lockr.set('farm-indexes', this.indexes)

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
        var sid = this.village.id
        var index = this.indexes[sid]
        var targets = this.targets[sid]

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
                var included = scope.includedVillages.includes(target.id)

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
            var coords = scope.village.position
            var distance = $math.actualDistance(coords, target)

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
        var self = this
        var coords = self.village.position
        var sid = self.village.id

        if (sid in self.targets) {
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
                self.event('startLoadingTargers')

                var loads = $convert.scaledGridCoordinates(x, y, w, h, chunk)
                var length = loads.length
                var index = 0

                $mapData.loadTownDataAsync(x, y, w, h, function () {
                    if (++index === length) {
                        self.event('endLoadingTargers')

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
                return !fn(self, target)
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
                var hasVillages = self.nextVillage()

                if (hasVillages) {
                    self.getTargets(callback)
                } else {
                    self.event('noTargets')
                }

                return false
            }

            self.targets[sid] = filteredTargets.sort(function (a, b) {
                return a.distance - b.distance
            })

            if (self.indexes.hasOwnProperty(sid)) {
                if (self.indexes[sid] > self.targets[sid].length) {
                    self.indexes[sid] = 0

                    Lockr.set('farm-indexes', self.indexes)
                }
            } else {
                self.indexes[sid] = 0

                Lockr.set('farm-indexes', self.indexes)
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
        var self = this

        if (self.singleVillage) {
            return false
        }

        var free = self.villages.filter(function (village) {
            return !self.waiting[village.id]
        })

        if (!free.length) {
            self.event('noVillages')
            return false
        } else if (free.length === 1) {
            self.village = free[0]
            self.event('nextVillage', [self.village])
            return true
        }

        var index = free.indexOf(self.village) + 1
        self.village = free[index] ? free[index] : free[0]
        
        self.event('nextVillage', [self.village])
        self.updateActivity()

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
        var i = this.villages.indexOf(vid)

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
            var listeners = this.eventListeners[type]

            for (var i = 0; i < listeners.length; i++) {
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
        var self = this

        var updatePresets = function (presets) {
            self.presets = []

            if (!self.settings.presetName) {
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

                if (cleanName === self.settings.presetName) {
                    presets[id].cleanName = cleanName
                    presets[id].units = cleanPresetUnits(presets[id].units)

                    self.presets.push(presets[id])
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
                self.event('presetsLoaded')
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
        
        var vid = this.village.id
        var villagePresets = $presetList.getPresetsByVillageId(vid)
        var needAssign = false
        var which = []

        this.presets.forEach(function (preset) {
            if (!villagePresets.hasOwnProperty(preset.id)) {
                needAssign = true
                which.push(preset.id)
            }
        })

        if (needAssign) {
            for (var id in villagePresets) {
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
        var self = this
        var types = ['groupIgnore', 'groupInclude', 'groupOnly']
        var groups = $model.getGroupList().getGroups()

        types.forEach(function (type) {
            self[type] = null

            for (var id in groups) {
                if (id == self.settings[type]) {
                    self[type] = {
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
    FarmOverflow.prototype.updateExceptionVillages = function () {
        var groupList = $model.getGroupList()

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
        var self = this
        var villages = self.player.getVillageList()

        villages = villages.map(function (village) {
            return new Village(village)
        })

        villages = villages.filter(function (village) {
            return !self.ignoredVillages.includes(village.id)
        })

        if (self.groupOnly) {
            var groupList = $model.getGroupList()
            var groupVillages = groupList.getGroupVillageIds(self.groupOnly.id)

            villages = villages.filter(function (village) {
                return groupVillages.includes(village.id)
            })
        }

        self.villages = villages
        self.singleVillage = self.villages.length === 1
        self.village = self.villages[0]

        // Reinicia comandos imediatamente se liberar alguma aldeia
        // que nao esteja na lista de espera.
        if (self.commander.running && self.globalWaiting) {
            for (var i = 0; i < villages.length; i++) {
                var village = villages[i]

                if (!self.waiting[village.id]) {
                    self.globalWaiting = false
                    self.commander.analyse()

                    break
                }
            }
        }

        self.event('villagesUpdate')
    }

    /**
     * Adiciona a aldeia especificada no grupo de aldeias ignoradas
     *
     * @param {Object} target - Dados da aldeia a ser ignorada.
     */
    FarmOverflow.prototype.ignoreVillage = function (target) {
        var self = this

        if (!self.groupIgnore) {
            return false
        }

        $socket.emit($route.GROUPS_LINK_VILLAGE, {
            group_id: self.groupIgnore.id,
            village_id: target.id
        }, function () {
            self.event('ignoredVillage', [target])
        })
    }

    /**
     * Verifica se o alvo está relacionado a alguma aldeia do jogador.
     *
     * @param {Number} targetId - ID da aldeia
     */
    FarmOverflow.prototype.targetExists = function (targetId) {
        for (var vid in this.targets) {
            var villageTargets = this.targets[vid]

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
    FarmOverflow.prototype.listeners = function () {
        var self = this

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
            
            if (self.waiting[vid]) {
                delete self.waiting[vid]

                if (self.globalWaiting) {
                    self.globalWaiting = false

                    if (self.commander.running) {
                        self.selectVillage(vid)

                        setTimeout(function () {
                            self.commander.analyse()
                        }, 10000)
                    }
                }

                return false
            }
        }

        // Detecta alterações e atualiza lista de predefinições configuradas
        // no script.
        var updatePresets = function () {
            self.updatePresets()
            self.event('presetsChange')

            if (!self.presets.length) {
                if (self.commander.running) {
                    self.event('noPreset')
                    self.stop()
                }
            }
        }

        // Atualiza lista de grupos configurados no script.
        // Atualiza a lista de aldeias incluidas/ignoradas com base
        // nos grupos.
        var updateGroups = function (event, data) {
            self.updateExceptionGroups()
            self.updateExceptionVillages()

            self.event('groupsChanged')
        }

        // Detecta grupos que foram adicionados nas aldeias.
        // Atualiza a lista de alvos e aldeias do jogador.
        var updateGroupVillages = function (event, data) {
            self.updatePlayerVillages()

            if (!self.groupInclude) {
                return false
            }
            
            if (self.groupInclude.id === data.group_id) {
                self.targets = {}
            }
        }

        // Adiciona o grupo de "ignorados" no alvo caso o relatório do
        // ataque tenha causado alguma baixa nas tropas.
        var ignoreOnLoss = function (report) {
            var target = self.targetExists(report.target_village_id)

            if (!target) {
                return false
            }

            self.ignoreVillage(target)

            return true
        }

        // Adiciona alvos na lista de prioridades caso o relatório
        // do farm seja lotado.
        var priorityTargets = function (report) {
            var vid = report.attVillageId
            var tid = report.defVillageId

            self.priorityTargets[vid] = self.priorityTargets[vid] || []

            if (self.priorityTargets[vid].includes(tid)) {
                return false
            }

            self.priorityTargets[vid].push(tid)

            self.event('priorityTargetAdded', [{
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
            if (self.settings.ignoreOnLoss && data.result !== 1) {
                ignoreOnLoss(data)
            }

            // HAUL_TYPES = {
            //     'FULL'      : 'full',
            //     'PARTIAL'   : 'partial',
            //     'NONE'      : 'none'
            // }
            if (self.settings.priorityTargets && data.haul === 'full') {
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
            if (self.commander.running) {
                setTimeout(function () {
                    self.disableNotifs(function () {
                        self.stop()
                        self.start()
                    })
                }, 3000)
            }
        }

        // Detecta mensagens do jogador enviadas para sí mesmo, afim de iniciar
        // e pausar o farm remotamente.
        var remoteHandler = function (event, data) {
            var id = self.settings.remoteId

            if (data.participants.length !== 1 || data.title !== id) {
                return false
            }

            var userMessage = data.message.content.trim().toLowerCase()

            switch (userMessage) {
            case 'on':
                self.disableNotifs(function () {
                    self.stop()
                    self.start()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                self.event('remoteCommand', ['on'])

                break
            case 'off':
                self.disableNotifs(function () {
                    self.stop()
                })

                replyMessage(data.message_id, REMOTE_SWITCH_RESPONSE)
                self.event('remoteCommand', ['off'])

                break
            case 'status':
                var village = self.village
                var villageLabel = village.name + ' (' + village.x + '|' + village.y + ')'
                var lastAttack = $filter('readableDateFilter')(self.lastAttack)

                var bbcodeMessage = [
                    '[b]' + self.lang.events.status + ':[/b] ' + self.status + '[br]',
                    '[b]' + self.lang.events.selectedVillage + ':[/b] ',
                    '[village=' + village.id + ']' + villageLabel + '[/village][br]',
                    '[b]' + self.lang.events.lastAttack + ':[/b] ' + lastAttack
                ].join('')

                replyMessage(data.message_id, bbcodeMessage)
                self.event('remoteCommand', ['status'])

                break
            }

            return false
        }

        var bind = function (eventType, handler) {
            var unbind = $root.$on($eventType[eventType], handler)

            self.activeListeners.push(unbind)
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

        var events = self.lang.events

        // Lista de eventos para atualizar o último status do FarmOverflow.
        self.on('sendCommand', function () {
            self.updateLastAttack()
            self.updateLastStatus(events.attacking)
        })
        self.on('noPreset', function () {
            self.updateLastStatus(events.paused)
        })
        self.on('noUnits', function () {
            self.updateLastStatus(events.noUnits)
        })
        self.on('noUnitsNoCommands', function () {
            self.updateLastStatus(events.noUnitsNoCommands)
        })
        self.on('start', function () {
            self.updateLastStatus(events.attacking)
        })
        self.on('pause', function () {
            self.updateLastStatus(events.paused)
        })
        self.on('startLoadingTargers', function () {
            self.updateLastStatus(events.loadingTargets)
        })
        self.on('endLoadingTargers', function () {
            self.updateLastStatus(events.analyseTargets)
        })
        self.on('commandLimitSingle', function () {
            self.updateLastStatus(events.commandLimit)
        })
        self.on('commandLimitMulti', function () {
            self.updateLastStatus(events.noVillages)
        })
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
        for (var i = 0; i < this.villages.length; i++) {
            var vid = this.villages[i].id

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
        var i18n = {
            pt_br: ___langPt_br,
            en_us: ___langEn_us
        }

        var gameLang = gameLocale.LANGUAGE

        var aliases = {
            'pt_pt': 'pt_br',
            'en_dk': 'en_us'
        }

        if (gameLang in aliases) {
            gameLang = aliases[gameLang]
        }

        if (this.settings.language) {
            this.lang = i18n[this.settings.language]
        } else {
            var lang = gameLang in i18n ? gameLang : 'en_us'
            this.lang = i18n[lang]
            this.settings.language = lang
        }
    }

    return FarmOverflow
})
