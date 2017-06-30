define('TWOverflow/Farm/interface', [
    'TWOverflow/Farm',
    'TWOverflow/locale',
    'TWOverflow/Interface',
    'TWOverflow/Interface/buttonLink',
    'TWOverflow/FrontButton',
    'helper/time',
    'Lockr',
    'ejs'
], function (
    Farm,
    Locale,
    Interface,
    buttonLink,
    FrontButton,
    $timeHelper,
    Lockr,
    ejs
) {
    // Controlador de interface
    var ui
    // Controlador do botão para abrir a janela da interface
    var opener
    // Atalhos rapidos para os elementos da janela.
    var $window
    var $events
    var $last
    var $status
    var $start
    var $settings

    /**
     * Contagem de eventos inseridos na visualização.
     *
     * @type {Number}
     */
    var eventsCount = 1

    /**
     * Usado para obter a identificação dos presets e a descrição.
     *
     * @type {RegExp}
     */
    var rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/

    /**
     * Gera um <select>
     * 
     * @param  {String} value - Valor do select
     * @param  {String} label - Texto exibido no select
     * @param  {Boolean} selected - Inclui o atributo "selected"
     * @return {String} Select montado
     */
    var genSelect = function (value, label, selected) {
        return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + label + '</option>'
    }

    /**
     * Formato das datas usadas nos eventos.
     * 
     * @type {String}
     */
    var dateFormat = 'dd/MM/yyyy hh:mm:ss'

    /**
     * Lista de grupos disponíveis na conta do jogador
     *
     * @type {Object}
     */
    var groups

    /**
     * Elementos dos grupos usados pelo FarmOverflow.
     * 
     * @type {Object}
     */
    var $groups

    /**
     * Atualiza as informações rápidas do botão inicial do FarmOverflow
     * @return {[type]} [description]
     */
    var updateQuickview = function () {
        var last = Locale('farm', 'events.lastAttack')
        var text = last + ': ' + $last.html()

        opener.updateQuickview(text)
    }

    /**
     * Loop em todas configurações do FarmOverflow
     * 
     * @param {Function} callback
     */
    var eachSetting = function (callback) {
        for (var key in Farm.settings) {
            var $input = $window.find('[name="' + key + '"]')

            if (!$input.length) {
                continue
            }

            callback($input)
        }
    }

    /**
     * Insere as configurações na interface.
     */
    var populateSettings = function () {
        eachSetting(function ($input) {
            var type = $input[0].type
            var name = $input[0].name

            if (type === 'select-one') {
                if (name === 'language') {
                    $input[0].value = Farm.settings.language
                }

                return
            }

            if (type === 'checkbox') {
                if (Farm.settings[name]) {
                    $input[0].checked = true
                    $input.parent().addClass('icon-26x26-checkbox-checked')
                }

                return
            }

            $input.val(Farm.settings[name])
        })
    }

    /**
     * Configura todos eventos dos elementos da interface.
     */
    var bindEvents = function () {
        $hotkeys.add(Farm.settings.hotkeySwitch, function () {
            Farm.switch()
        })

        $hotkeys.add(Farm.settings.hotkeyWindow, function () {
            ui.openWindow()
        })

        $start.on('click', function () {
            Farm.switch()
        })

        $settings.on('submit', function (event) {
            event.preventDefault()

            if ($settings[0].checkValidity()) {
                var settings = {}

                eachSetting(function ($input) {
                    var name = $input[0].name
                    var type = $input[0].type
                    var value = $input.val()

                    if ($input[0].type === 'number') {
                        value = parseInt(value, 10)
                    }

                    settings[name] = value
                })

                Farm.updateSettings(settings)

                if (Farm.notifsEnabled) {
                    emitNotif('success', Locale('farm', 'settings.saved'))
                }
            }

            return false
        })

        $window.find('.save').on('click', function (event) {
            $settings.find('input:submit')[0].click()
        })
    }

    /**
     * Atualiza o elemento com a data do último ataque enviado
     * Tambem armazena para ser utilizado nas proximas execuções.
     *
     * @param {[type]} [varname] [description]
     */
    var updateLastAttack = function (lastAttack) {
        if (!lastAttack) {
            lastAttack = Farm.lastAttack

            if (lastAttack === -1) {
                return false
            }
        }

        $last.html(readableDateFilter(lastAttack, null, null, null, dateFormat))

        updateQuickview()
    }

    /**
     * Adiciona um evento na aba "Eventos".
     *
     * @param {Object} options - Opções do evento.
     * @param {Boolean=} _populate - Indica quando o script está apenas populando
     *      a lista de eventos, então não é alterado o "banco de dados".
     */
    var addEvent = function (options, _populate) {
        $events.find('.nothing').remove()

        if (eventsCount >= Farm.settings.eventsLimit) {
            $events.find('tr:last-child').remove()
        }

        if (Farm.lastEvents.length >= Farm.settings.eventsLimit) {
            Farm.lastEvents.pop()
        }

        addRow($events, options, _populate)
        eventsCount++

        if (!_populate) {
            options.timestamp = $timeHelper.gameTime()

            Farm.lastEvents.unshift(options)
            Farm.updateLastEvents()
        }
    }

    /**
     * Adiciona uma linha (tr) com links internos do jogo.
     *
     * @param {Object} options
     * @param {Boolean} [_populate] - Indica quando o script está apenas populando
     *      a lista de eventos, então os elementos são adicionados no final da lista.
     */
    var addRow = function ($where, options, _populate) {
        // Copia o objeto porque ele será armazenado e não queremos os
        // dados guardados já renderizados.
        options = angular.copy(options)

        var buttons = {}
        var replaces = {}

        if (options.links) {
            for (var key in options.links) {
                var button = buttonLink(options.links[key].type, options.links[key].name)
                buttons[key] = button
                replaces[key] = button.html
            }

            options.text = Locale('farm', 'events.' + options.type, replaces)
        }

        var $tr = document.createElement('tr')

        $tr.innerHTML = ejs.render('___htmlFarmEvent', {
            date: readableDateFilter(options.timestamp || $timeHelper.gameTime(), null, null, null, dateFormat),
            icon: options.icon,
            text: options.text
        })

        if (!options.icon) {
            $tr.querySelector('.icon-bg-black').remove()
            $tr.querySelector('.text-tribe-news').className = ''
        }

        if (options.links) {
            for (var key in buttons) {
                options.links[key].elem = $tr.querySelector('#' + buttons[key].id)
                options.links[key].elem.addEventListener('click', function () {
                    $wds.openVillageInfo(options.links[key].id)
                })
            }
        }

        $where[_populate ? 'append' : 'prepend']($tr)
        ui.$scrollbar.recalc()
    }

    /**
     * Atualiza o elemento com a aldeias atualmente selecionada
     */
    var updateSelectedVillage = function () {
        var $selected = $window.find('.selected')

        if (!Farm.village) {
            return $selected.html(Locale('farm', 'general.none'))
        }

        var village = buttonLink('village', villageLabel(Farm.village), Farm.village.id)

        $selected.html('')
        $selected.append(village.elem)
    }

    /**
     * Popula a lista de eventos que foram gerados em outras execuções
     * do FarmOverflow.
     */
    var populateEvents = function () {
        // Caso tenha algum evento, remove a linha inicial "Nada aqui ainda"
        if (Farm.lastEvents.length > 0) {
            $events.find('.nothing').remove()
        }

        Farm.lastEvents.some(function (event) {
            if (eventsCount >= Farm.settings.eventsLimit) {
                return true
            }

            if (!Farm.settings.eventAttack && event.type === 'sendCommand') {
                return
            }

            if (!Farm.settings.eventVillageChange && event.type === 'nextVillage') {
                return
            }

            if (!Farm.settings.eventPriorityAdd && event.type === 'priorityTargetAdded') {
                return
            }

            if (!Farm.settings.eventIgnoredVillage && event.type === 'ignoredVillage') {
                return
            }

            addEvent(event, true)
        })
    }

    /**
     * Atualiza a lista de grupos na aba de configurações.
     */
    var updateGroupList = function () {
        for (var type in $groups) {
            $groups[type].html(genSelect('', Locale('farm', 'general.disabled')))

            for (var id in groups) {
                var name = groups[id].name
                var selected = Farm.settings[type] == id
                
                $groups[type].append(genSelect(id, name, selected))
            }
        }
    }

    /**
     * Atualiza a lista de presets na aba de configurações.
     */
    var updatePresetList = function () {
        var loaded = {}
        var presets = $model.getPresetList().presets
        var $preset = $window.find('.preset')
        
        $preset.html(genSelect('', Locale('farm', 'general.disabled')))

        for (var id in presets) {
            var cleanName = presets[id].name.replace(rpreset, '').trim()

            if (cleanName in loaded) {
                continue
            }

            // presets apenas com descrição sem identificação são ignorados
            if (!cleanName) {
                continue
            }

            loaded[cleanName] = true
            var selected = Farm.settings.presetName === cleanName

            $preset.append(genSelect(cleanName, cleanName, selected))
        }
    }

    function FarmInterface () {
        groups = $model.getGroupList().getGroups()

        // Valores a serem substituidos no template da janela
        var replaces = {
            version: Farm.version,
            author: ___author,
            locale: Locale
        }

        ui = new Interface('farmOverflow-farm', {
            activeTab: 'info',
            template: '___htmlFarmWindow',
            replaces: replaces,
            css: '___cssFarm'
        })

        opener = new FrontButton('Farm')
        opener.hover(updateQuickview)
        opener.click(function () {
            ui.openWindow()
        })

        $window = $(ui.$window)
        $events = $window.find('.events')
        $last = $window.find('.last')
        $status = $window.find('.status')
        $start = $window.find('.start')
        $settings = $window.find('.settings')
        $groups = {
            groupIgnore: $window.find('.ignore'),
            groupInclude: $window.find('.include'),
            groupOnly: $window.find('.only')
        }



        Farm.bind('sendCommand', function (from, to) {
            $status.html(Locale('farm', 'events.attacking'))
            updateLastAttack($timeHelper.gameTime())

            if (!Farm.settings.eventAttack) {
                return false
            }

            addEvent({
                links: {
                    origin: { type: 'village', name: villageLabel(from), id: from.id },
                    target: { type: 'village', name: villageLabel(to), id: to.id }
                },
                icon: 'attack-small',
                type: 'sendCommand'
            })
        })

        Farm.bind('nextVillage', function (next) {
            updateSelectedVillage()
            
            if (!Farm.settings.eventVillageChange) {
                return false
            }

            addEvent({
                links: {
                    village: { type: 'village', name: villageLabel(next), id: next.id }
                },
                icon: 'village',
                type: 'nextVillage'
            })
        })

        Farm.bind('ignoredVillage', function (target) {
            if (!Farm.settings.eventIgnoredVillage) {
                return false
            }

            addEvent({
                links: {
                    target: { type: 'village', name: villageLabel(target), id: target.id }
                },
                icon: 'check-negative',
                type: 'ignoredVillage'
            })
        })

        Farm.bind('priorityTargetAdded', function (target) {
            if (!Farm.settings.eventPriorityAdd) {
                return false
            }
            
            addEvent({
                links: {
                    target: { type: 'village', name: villageLabel(target), id: target.id }
                },
                icon: 'parallel-recruiting',
                type: 'priorityTargetAdded'
            })
        })

        Farm.bind('noPreset', function () {
            addEvent({
                icon: 'info',
                type: 'noPreset'
            })

            $status.html(Locale('farm', 'events.paused'))
        })

        Farm.bind('noUnits', function () {
            if (Farm.singleVillage) {
                $status.html(Locale('farm', 'events.noUnits'))
            }
        })

        Farm.bind('noUnitsNoCommands', function () {
            $status.html(Locale('farm', 'events.noUnitsNoCommands'))
        })

        Farm.bind('start', function () {
            $status.html(Locale('farm', 'events.attacking'))
        })

        Farm.bind('pause', function () {
            $status.html(Locale('farm', 'events.paused'))
        })

        Farm.bind('noVillages', function () {
            $status.html(Locale('farm', 'events.noVillages'))
        })

        Farm.bind('villagesUpdate', function () {
            updateSelectedVillage()
        })

        Farm.bind('startLoadingTargers', function () {
            $status.html(Locale('farm', 'events.loadingTargets'))
        })

        Farm.bind('endLoadingTargers', function () {
            $status.html(Locale('farm', 'events.analyseTargets'))
        })

        Farm.bind('attacking', function () {
            $status.html(Locale('farm', 'events.attacking'))
        })

        Farm.bind('commandLimitSingle', function () {
            $status.html(Locale('farm', 'events.commandLimit'))
        })

        Farm.bind('commandLimitMulti', function () {
            $status.html(Locale('farm', 'events.noVillages'))
        })

        Farm.bind('resetEvents', function () {
            eventsCount = 0
            populateEvents()
        })

        Farm.bind('groupsChanged', function () {
            updateGroupList()
        })

        Farm.bind('presetsLoaded', function () {
            updatePresetList()
        })

        Farm.bind('presetsChange', function () {
            updatePresetList()
        })

        Farm.bind('start', function () {
            $start.html(Locale('farm', 'general.pause'))
            $start.removeClass('btn-green').addClass('btn-red')
            opener.$elem.removeClass('btn-green').addClass('btn-red')
        })

        Farm.bind('pause', function () {
            $start.html(Locale('farm', 'general.start'))
            $start.removeClass('btn-red').addClass('btn-green')
            opener.$elem.removeClass('btn-red').addClass('btn-green')
        })

        if ($presetList.isLoaded()) {
            updatePresetList()
        }

        populateSettings()
        bindEvents()
        updateGroupList()
        updateSelectedVillage()
        updateLastAttack()
        populateEvents()
    }

    return FarmInterface
})
