define('TWOverflow/Farm/interface', [
    'TWOverflow/Farm',
    'TWOverflow/Farm/locale',
    'TWOverflow/Interface',
    'TWOverflow/Interface/buttonLink',
    'TWOverflow/FrontButton',
    'helper/time',
    'Lockr',
    'ejs'
], function (
    Farm,
    FarmLocale,
    Interface,
    buttonLink,
    FrontButton,
    $timeHelper,
    Lockr,
    ejs
) {
    var ui
    var opener
    var events
    var visibleEventCount
    var $window
    var $events
    var $last
    var rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/
    var rtemplate = /%\{[^\}]+\}/g
    var disabledSelect = genSelect('', FarmLocale('general.disabled'))

    function FarmInterface () {
        ui = new Interface('farmOverflow-farm', {
            activeTab: 'info',
            css: '___cssFarm',
            template: '___htmlFarmWindow',
            replaces: {
                version: Farm.version,
                author: ___author,
                locale: FarmLocale
            }
        })

        opener = new FrontButton('Farm', {
            hoverText: updateQuickview
        })

        $window = $(ui.$window)
        $events = $window.find('.events')
        $last = $window.find('.last')

        events = Lockr.get('farm-lastEvents', [], true)
        visibleEventCount = 1

        bindSettings()
        bindEvents()
        updateGroupList()
        updateSelectedVillage()
        updateLastAttack()
        populateEvents()

        if ($presetList.isLoaded()) {
            updatePresetList()
        }

        Farm.bind('groupsChanged', function () {
            updateGroupList()
        })

        Farm.bind('presetsLoaded', function () {
            updatePresetList()
        })

        Farm.bind('presetsChange', function () {
            updatePresetList()
        })

        opener.click(function () {
            ui.openWindow()
        })

        $hotkeys.add(Farm.settings.hotkeySwitch, function () {
            Farm.switch()
        })

        $hotkeys.add(Farm.settings.hotkeyWindow, function () {
            ui.openWindow()
        })

        var $start = $window.find('.start')

        $start.on('click', function () {
            Farm.switch()
        })

        Farm.bind('start', function () {
            $start.html(FarmLocale('general.pause'))
            $start.removeClass('btn-green').addClass('btn-red')
            opener.$elem.removeClass('btn-green').addClass('btn-red')
        })

        Farm.bind('pause', function () {
            $start.html(FarmLocale('general.start'))
            $start.removeClass('btn-red').addClass('btn-green')
            opener.$elem.removeClass('btn-red').addClass('btn-green')
        })
    }

    /**
     * Loop em todas configurações do FarmOverflow
     * @param {Function} callback
     */
    function eachSetting (callback) {
        for (var key in Farm.settings) {
            var $input = $window.find('[name="' + key + '"]')

            if (!$input.length) {
                continue
            }

            callback($input)
        }
    }

    /**
     * Listeners das para alteração das configurações do FarmOverflow.
     */
    function bindSettings () {
        // Insere os valores nas entradas
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

                $input.on('click', function () {
                    $input.parent().toggleClass('icon-26x26-checkbox-checked')
                })

                return
            }

            $input.val(Farm.settings[name])
        })

        // Quarda os valores quando salvos
        var $settings = $window.find('.settings')

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
                    emitNotif('success', FarmLocale('settings.saved'))
                }
            }

            return false
        })

        $window.find('.save').on('click', function (event) {
            $settings.find('input:submit')[0].click()
        })
    }

    /**
     * Adiciona eventos na interface com base nos eventos do FarmOverflow.
     */
    function bindEvents () {
        var settings = Farm.settings
        var $status = $window.find('.status')

        var listenEvents = {
            sendCommand: function (from, to) {
                $status.html(FarmLocale('events.attacking'))
                updateLastAttack($timeHelper.gameTime())

                if (!settings.eventAttack) {
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
            },
            nextVillage: function (next) {
                updateSelectedVillage()
                
                if (!settings.eventVillageChange) {
                    return false
                }

                addEvent({
                    links: {
                        village: { type: 'village', name: villageLabel(next), id: next.id }
                    },
                    icon: 'village',
                    type: 'nextVillage'
                })
            },
            ignoredVillage: function (target) {
                if (!settings.eventIgnoredVillage) {
                    return false
                }

                addEvent({
                    links: {
                        target: { type: 'village', name: villageLabel(target), id: target.id }
                    },
                    icon: 'check-negative',
                    type: 'ignoredVillage'
                })
            },
            priorityTargetAdded: function (target) {
                if (!settings.eventPriorityAdd) {
                    return false
                }
                
                addEvent({
                    links: {
                        target: { type: 'village', name: villageLabel(target), id: target.id }
                    },
                    icon: 'parallel-recruiting',
                    type: 'priorityTargetAdded'
                })
            },
            noPreset: function () {
                addEvent({
                    icon: 'info',
                    type: 'noPreset'
                })

                $status.html(FarmLocale('events.paused'))
            },
            noUnits: function () {
                if (Farm.singleVillage) {
                    $status.html(FarmLocale('events.noUnits'))
                }
            },
            noUnitsNoCommands: function () {
                $status.html(FarmLocale('events.noUnitsNoCommands'))
            },
            start: function () {
                $status.html(FarmLocale('events.attacking'))
            },
            pause: function () {
                $status.html(FarmLocale('events.paused'))
            },
            noVillages: function () {
                $status.html(FarmLocale('events.noVillages'))
            },
            villagesUpdate: function () {
                updateSelectedVillage()
            },
            startLoadingTargers: function () {
                $status.html(FarmLocale('events.loadingTargets'))
            },
            endLoadingTargers: function () {
                $status.html(FarmLocale('events.analyseTargets'))
            },
            attacking: function () {
                $status.html(FarmLocale('events.attacking'))
            },
            commandLimitSingle: function () {
                $status.html(FarmLocale('events.commandLimit'))
            },
            commandLimitMulti: function () {
                $status.html(FarmLocale('events.noVillages'))
            },
            resetEvents: function () {
                visibleEventCount = 0
                populateEvents()
            }
        }

        for (var e in listenEvents) {
            Farm.bind(e, listenEvents[e])
        }
    }

    /**
     * Atualiza o elemento com a data do último ataque enviado
     * Tambem armazena para ser utilizado nas proximas execuções.
     */
    function updateLastAttack (lastAttack) {
        if (!lastAttack) {
            lastAttack = Farm.lastAttack

            if (lastAttack === -1) {
                return
            }
        }

        var readable = readableDateFilter(lastAttack)
        var langLast = FarmLocale('events.lastAttack')

        $last.html(readable)
        updateQuickview()
    }

    /**
     * Adiciona um evento na aba "Eventos".
     *
     * @param {Object} options - Opções do evento.
     * @param {Boolean} [_populate] - Indica quando o script está apenas populando
     *      a lista de eventos, então não é alterado o "banco de dados".
     */
    function addEvent (options, _populate) {
        var limit = Farm.settings.eventsLimit

        $events.find('.nothing').remove()

        if (visibleEventCount >= limit) {
            $events.find('tr:last-child').remove()
        }

        if (events.length >= limit) {
            events.pop()
        }

        addRow($events, options, _populate)
        visibleEventCount++

        if (!_populate) {
            options.timestamp = $timeHelper.gameTime()
            events.unshift(options)
            
            Lockr.set('farm-lastEvents', events)
        }
    }

    /**
     * Adiciona uma linha (tr) com links internos do jogo.
     *
     * @param {Object} options
     * @param {Boolean} [_populate] - Indica quando o script está apenas populando
     *      a lista de eventos, então os elementos são adicionados no final da lista.
     */
    function addRow ($where, options, _populate) {
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

            options.text = FarmLocale('events.' + options.type, replaces)
        }

        var $tr = document.createElement('tr')

        $tr.innerHTML = ejs.render('___htmlFarmEvent', {
            date: readableDateFilter(options.timestamp || $timeHelper.gameTime()),
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
    function updateSelectedVillage () {
        var $selected = $window.find('.selected')

        if (!Farm.village) {
            return $selected.html(FarmLocale('general.none'))
        }

        var village = buttonLink('village', villageLabel(Farm.village), Farm.village.id)

        $selected.html('')
        $selected.append(village.elem)
    }

    /**
     * Popula a lista de eventos que foram gerados em outras execuções
     * do FarmOverflow.
     */
    function populateEvents () {
        var settings = Farm.settings
        
        // Caso tenha algum evento, remove a linha inicial "Nada aqui ainda"
        if (events.length > 0) {
            $events.find('.nothing').remove()
        }

        for (var i = 0; i < events.length; i++) {
            if (visibleEventCount >= settings.eventsLimit) {
                break
            }

            var event = events[i]

            if (!settings.eventAttack && event.type === 'sendCommand') {
                continue
            }

            if (!settings.eventVillageChange && event.type === 'nextVillage') {
                continue
            }

            if (!settings.eventPriorityAdd && event.type === 'priorityTargetAdded') {
                continue
            }

            if (!settings.eventIgnoredVillage && event.type === 'ignoredVillage') {
                continue
            }

            addEvent(event, true)
        }
    }

    /**
     * Atualiza a lista de grupos na aba de configurações.
     */
    function updateGroupList () {
        var types = ['groupIgnore', 'groupInclude', 'groupOnly']
        var groups = $model.getGroupList().getGroups()

        var $groups = {
            groupIgnore: $window.find('.ignore'),
            groupInclude: $window.find('.include'),
            groupOnly: $window.find('.only')
        }

        for (var type in $groups) {
            $groups[type].html(disabledSelect)

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
    function updatePresetList () {
        var loaded = {}
        var presets = $model.getPresetList().presets
        var $preset = $window.find('.preset')
        
        $preset.html(disabledSelect)

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

    function updateQuickview () {
        return FarmLocale('events.lastAttack') + ': ' + $last.html()
    }

    function genSelect (value, label, selected) {
        return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + label + '</option>'
    }

    return FarmInterface
})
