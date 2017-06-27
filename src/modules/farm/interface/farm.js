define('TWOverflow/Farm/interface', [
    'TWOverflow/Farm',
    'TWOverflow/Farm/locale',
    'TWOverflow/Interface',
    'TWOverflow/Interface/ButtonLink',
    'TWOverflow/FrontButton',
    'helper/time',
    'Lockr',
    'ejs'
], function (
    Farm,
    FarmLocale,
    Interface,
    ButtonLink,
    FrontButton,
    $timeHelper,
    Lockr,
    ejs
) {
    var farmInterface
    var farmButton
    var events
    var visibleEventCount
    var rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/

    function FarmInterface () {
        farmInterface = new Interface('farmOverflow-farm', {
            activeTab: 'info',
            css: '___cssFarm',
            template: '___htmlFarmWindow',
            replaces: {
                version: Farm.version,
                author: ___author,
                locale: FarmLocale
            }
        })

        farmButton = new FrontButton({
            label: 'Farm',
            classHover: 'expand-button',
            classBlur: 'contract-button',
            hoverText: updateQuickview
        })

        var $window = $(farmInterface.$window)

        farmInterface.$settings = $window.find('.settings')
        farmInterface.$save = $window.find('.save')
        farmInterface.$start = $window.find('.start')
        farmInterface.$preset = $window.find('.preset')
        farmInterface.$selected = $window.find('.selected')
        farmInterface.$events = $window.find('.events')
        farmInterface.$status = $window.find('.status')
        farmInterface.$last = $window.find('.last')
        farmInterface.$groups = {
            groupIgnore: $window.find('.ignore'),
            groupInclude: $window.find('.include'),
            groupOnly: $window.find('.only')
        }

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

        farmButton.click(function () {
            farmInterface.openWindow()
        })

        farmInterface.$start.on('click', function () {
            Farm.switch()
        })

        $hotkeys.add(Farm.settings.hotkeySwitch, function () {
            Farm.switch()
        })

        $hotkeys.add(Farm.settings.hotkeyWindow, function () {
            farmInterface.openWindow()
        })

        Farm.bind('start', function () {
            farmInterface.$start.html(FarmLocale('general.pause'))
            farmInterface.$start.removeClass('btn-green').addClass('btn-red')
            farmButton.$elem.removeClass('btn-green').addClass('btn-red')
        })

        Farm.bind('pause', function () {
            farmInterface.$start.html(FarmLocale('general.start'))
            farmInterface.$start.removeClass('btn-red').addClass('btn-green')
            farmButton.$elem.removeClass('btn-red').addClass('btn-green')
        })
    }

    /**
     * Loop em todas configurações do FarmOverflow
     * @param {Function} callback
     */
    function eachSetting (callback) {
        for (var key in Farm.settings) {
            var $input = $('[name="' + key + '"]', farmInterface.$window)

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
        farmInterface.$settings.on('submit', function (event) {
            event.preventDefault()

            if (farmInterface.$settings[0].checkValidity()) {
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

        farmInterface.$save.on('click', function (event) {
            farmInterface.$settings.find('input:submit')[0].click()
        })
    }

    /**
     * Adiciona eventos na interface com base nos eventos do FarmOverflow.
     */
    function bindEvents () {
        var settings = Farm.settings

        var listenEvents = {
            sendCommand: function (from, to) {
                farmInterface.$status.html(FarmLocale('events.attacking'))
                updateLastAttack($timeHelper.gameTime())

                if (!settings.eventAttack) {
                    return false
                }

                var labelFrom = from.name + ' (' + from.x + '|' + from.y + ')'
                var labelTo = to.name + ' (' + to.x + '|' + to.y + ')'

                addEvent({
                    links: [
                        { type: 'village', name: labelFrom, id: from.id },
                        { type: 'village', name: labelTo, id: to.id }
                    ],
                    icon: 'attack-small',
                    type: 'sendCommand'
                })
            },
            nextVillage: function (next) {
                updateSelectedVillage()
                
                if (!settings.eventVillageChange) {
                    return false
                }

                var label = next.name + ' (' + next.x + '|' + next.y + ')'

                addEvent({
                    links: [
                        { type: 'village', name: label, id: next.id }
                    ],
                    icon: 'village',
                    type: 'nextVillage'
                })
            },
            ignoredVillage: function (target) {
                if (!settings.eventIgnoredVillage) {
                    return false
                }

                var label = target.name + ' (' + target.x + '|' + target.y + ')'

                addEvent({
                    links: [
                        { type: 'village', name: label, id: target.id }
                    ],
                    icon: 'check-negative',
                    type: 'ignoredVillage'
                })
            },
            priorityTargetAdded: function (target) {
                if (!settings.eventPriorityAdd) {
                    return false
                }
                
                var label = target.name + ' (' + target.x + '|' + target.y + ')'

                addEvent({
                    links: [
                        { type: 'village', name: label, id: target.id }
                    ],
                    icon: 'parallel-recruiting',
                    type: 'priorityTargetAdded'
                })
            },
            noPreset: function () {
                addEvent({
                    icon: 'info',
                    type: 'noPreset'
                })

                farmInterface.$status.html(FarmLocale('events.paused'))
            },
            noUnits: function () {
                if (Farm.singleVillage) {
                    farmInterface.$status.html(FarmLocale('events.noUnits'))
                }
            },
            noUnitsNoCommands: function () {
                farmInterface.$status.html(FarmLocale('events.noUnitsNoCommands'))
            },
            start: function () {
                farmInterface.$status.html(FarmLocale('events.attacking'))
            },
            pause: function () {
                farmInterface.$status.html(FarmLocale('events.paused'))
            },
            noVillages: function () {
                farmInterface.$status.html(FarmLocale('events.noVillages'))
            },
            villagesUpdate: function () {
                updateSelectedVillage()
            },
            startLoadingTargers: function () {
                farmInterface.$status.html(FarmLocale('events.loadingTargets'))
            },
            endLoadingTargers: function () {
                farmInterface.$status.html(FarmLocale('events.analyseTargets'))
            },
            attacking: function () {
                farmInterface.$status.html(FarmLocale('events.attacking'))
            },
            commandLimitSingle: function () {
                farmInterface.$status.html(FarmLocale('events.commandLimit'))
            },
            commandLimitMulti: function () {
                farmInterface.$status.html(FarmLocale('events.noVillages'))
            },
            resetEvents: function () {
                visibleEventCount = 0
                populateEvents()
            },
            reloadInterface: function () {
                farmInterface.destroy()
                FarmInterface()
                farmInterface.openWindow()
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

        var readable = $filter('readableDateFilter')(lastAttack)
        var langLast = FarmLocale('events.lastAttack')

        farmInterface.$last.html(readable)
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

        farmInterface.$events.find('.nothing').remove()

        if (visibleEventCount >= limit) {
            farmInterface.$events.find('tr:last-child').remove()
        }

        if (events.length >= limit) {
            events.pop()
        }

        addRow(farmInterface.$events, options, _populate)
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
        var links = []

        // Copia o objeto porque ele será armazenado e não queremos os
        // dados guardados já renderizados.
        options = angular.copy(options)

        if (options.links) {
            for (var i = 0; i < options.links.length; i++) {
                links.push(ButtonLink(
                    options.links[i].type,
                    options.links[i].name
                ))
            }

            options.text = FarmLocale('events.' + options.type, {
                origin: links[0].html,
                target: links[1].html
            })
        }

        var $tr = document.createElement('tr')

        $tr.innerHTML = ejs.render('___htmlFarmEvent', {
            date: $filter('readableDateFilter')(options.timestamp || $timeHelper.gameTime()),
            icon: options.icon,
            text: options.text
        })

        if (!options.icon) {
            $tr.querySelector('.icon-bg-black').remove()
            $tr.querySelector('.text-tribe-news').className = ''
        }

        if (options.links) {
            for (var i = 0; i < links.length; i++) {
                options.links[i].elem = $tr.querySelector('#' + links[i].id)
                options.links[i].elem.addEventListener('click', function () {
                    $wds.openVillageInfo(options.links[i].id)
                })
            }
        }

        $where[_populate ? 'append' : 'prepend']($tr)
        farmInterface.$scrollbar.recalc()
    }

    /**
     * Atualiza o elemento com a aldeias atualmente selecionada
     */
    function updateSelectedVillage () {
        var selected = Farm.village

        if (!selected) {
            farmInterface.$selected.html(FarmLocale('general.none'))

            return false
        }

        var village = ButtonLink(
            'village',
            selected.name + ' (' + selected.x + '|' + selected.y + ')',
            Farm.village.id
        )

        farmInterface.$selected.html('')
        farmInterface.$selected.append(village.elem)
    }

    /**
     * Popula a lista de eventos que foram gerados em outras execuções
     * do FarmOverflow.
     */
    function populateEvents () {
        var settings = Farm.settings
        
        // Caso tenha algum evento, remove a linha inicial "Nada aqui ainda"
        if (events.length > 0) {
            farmInterface.$events.find('.nothing').remove()
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

        for (var type in farmInterface.$groups) {
            farmInterface.$groups[type].html(
                '<option value="">' + FarmLocale('general.disabled') + '</option>'
            )

            for (var id in groups) {
                var name = groups[id].name
                var selected = ''

                if (Farm.settings[type] == id) {
                    selected = 'selected'
                }

                farmInterface.$groups[type].append(
                    '<option value="' + id + '" ' + selected + '>' + name + '</option>'
                )
            }
        }
    }

    /**
     * Atualiza a lista de presets na aba de configurações.
     */
    function updatePresetList () {
        var loaded = {}
        var presets = $model.getPresetList().presets
        
        farmInterface.$preset.html(
            '<option value="">' + FarmLocale('general.disabled') + '</option>'
        )

        for (var id in presets) {
            var cleanName = presets[id].name.replace(rpreset, '').trim()

            if (cleanName in loaded) {
                continue
            }

            // presets apenas com descrição sem identificação são ignorados
            if (!cleanName) {
                continue
            }

            var selected = ''

            if (Farm.settings.presetName === cleanName) {
                selected = 'selected'
            }

            farmInterface.$preset.append(
                '<option value="' + cleanName + '" ' + selected + '>' + cleanName + '</option>'
            )

            loaded[cleanName] = true
        }
    }

    function updateQuickview () {
        var last = FarmLocale('events.lastAttack')
        
        return last + ': ' + farmInterface.$last.html()
    }

    return FarmInterface
})
