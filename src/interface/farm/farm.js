define('FarmOverflow/FarmInterface', [
    'helper/time',
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton'
], function ($timeHelper, Interface, FrontButton) {
    return function (farmOverflow) {
        /**
         * Loop em todas configurações do FarmOverflow
         * @param {Function} callback
         */
        function eachSetting (callback) {
            for (let key in farmOverflow.settings) {
                let $input = $(`[name="${key}"]`, farmInterface.$window)

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
            eachSetting(($input) => {
                let type = $input[0].type
                let name = $input[0].name

                if (type === 'select-one') {
                    if (name === 'language') {
                        $input[0].value = farmOverflow.settings.language
                    }

                    return
                }

                if (type === 'checkbox') {
                    if (farmOverflow.settings[name]) {
                        $input[0].checked = true
                        $input.parent().addClass(inputCheckedClass)
                    }

                    $input.on('click', () => {
                        $input.parent().toggleClass(inputCheckedClass)
                    })

                    return
                }

                $input.val(farmOverflow.settings[name])
            })

            // Quarda os valores quando salvos
            $settings.on('submit', (event) => {
                event.preventDefault()

                if ($settings[0].checkValidity()) {
                    let settings = {}

                    eachSetting(($input) => {
                        let name = $input[0].name
                        let type = $input[0].type
                        let value = $input.val()

                        if ($input[0].type === 'number') {
                            value = parseInt(value, 10)
                        }

                        settings[name] = value
                    })

                    farmOverflow.updateSettings(settings)

                    if (farmOverflow.notifsEnabled) {
                        emitNotif('success', farmOverflow.lang.settings.saved)
                    }
                }

                return false
            })

            $save.on('click', (event) => {
                $settings.find('input:submit')[0].click()
            })
        }

        /**
         * Adiciona eventos na interface com base nos eventos do FarmOverflow.
         */
        function bindEvents () {
            let settings = farmOverflow.settings

            let listenEvents = {
                sendCommand: (from, to) => {
                    $status.html(farmOverflow.lang.events.attacking)
                    updateLastAttack($timeHelper.gameTime())

                    if (!settings.eventAttack) {
                        return false
                    }

                    let labelFrom = `${from.name} (${from.x}|${from.y})`
                    let labelTo = `${to.name} (${to.x}|${to.y})`

                    addEvent({
                        links: [
                            { type: 'village', name: labelFrom, id: from.id },
                            { type: 'village', name: labelTo, id: to.id }
                        ],
                        icon: 'attack-small',
                        type: 'sendCommand'
                    })
                },
                nextVillage: (next) => {
                    updateSelectedVillage()
                    
                    if (!settings.eventVillageChange) {
                        return false
                    }

                    let label = `${next.name} (${next.x}|${next.y})`

                    addEvent({
                        links: [
                            { type: 'village', name: label, id: next.id }
                        ],
                        icon: 'village',
                        type: 'nextVillage'
                    })
                },
                ignoredVillage: (target) => {
                    if (!settings.eventIgnoredVillage) {
                        return false
                    }

                    let label = `${target.name} (${target.x}|${target.y})`

                    addEvent({
                        links: [
                            { type: 'village', name: label, id: target.id }
                        ],
                        icon: 'check-negative',
                        type: 'ignoredVillage'
                    })
                },
                priorityTargetAdded: (target) => {
                    if (!settings.eventPriorityAdd) {
                        return false
                    }
                    
                    let label = `${target.name} (${target.x}|${target.y})`

                    addEvent({
                        links: [
                            { type: 'village', name: label, id: target.id }
                        ],
                        icon: 'parallel-recruiting',
                        type: 'priorityTargetAdded'
                    })
                },
                noPreset: () => {
                    addEvent({
                        icon: 'info',
                        type: 'noPreset'
                    })

                    $status.html(farmOverflow.lang.events.paused)
                },
                noUnits: () => {
                    if (farmOverflow.singleVillage) {
                        $status.html(farmOverflow.lang.events.noUnits)
                    }
                },
                noUnitsNoCommands: () => {
                    $status.html(farmOverflow.lang.events.noUnitsNoCommands)
                },
                start: () => {
                    $status.html(farmOverflow.lang.events.attacking)
                },
                pause: () => {
                    $status.html(farmOverflow.lang.events.paused)
                },
                noVillages: () => {
                    $status.html(farmOverflow.lang.events.noVillages)
                },
                villagesUpdate: () => {
                    updateSelectedVillage()
                },
                startLoadingTargers: () => {
                    $status.html(farmOverflow.lang.events.loadingTargets)
                },
                endLoadingTargers: () => {
                    $status.html(farmOverflow.lang.events.analyseTargets)
                },
                attacking: () => {
                    $status.html(farmOverflow.lang.events.attacking)
                },
                commandLimitSingle: () => {
                    $status.html(farmOverflow.lang.events.commandLimit)
                },
                commandLimitMulti: () => {
                    $status.html(farmOverflow.lang.events.noVillages)
                },
                resetEvents: () => {
                    visibleEventCount = 0
                    populateEvents()
                }
            }

            for (let e in listenEvents) {
                farmOverflow.on(e, listenEvents[e])
            }
        }

        /**
         * Atualiza o elemento com a data do último ataque enviado
         * Tambem armazena para ser utilizado nas proximas execuções.
         */
        function updateLastAttack (lastAttack) {
            if (!lastAttack) {
                lastAttack = farmOverflow.lastAttack

                if (lastAttack === -1) {
                    return
                }
            }

            let readable = $filter('readableDateFilter')(lastAttack)
            let langLast = farmOverflow.lang.events.lastAttack

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
            let limit = farmOverflow.settings.eventsLimit

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
                
                Lockr.set('lastEvents', events)
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
            let links = []

            // Copia o objeto porque ele será armazenado e não queremos os
            // dados guardados já renderizados.
            options = angular.copy(options)

            if (options.links) {
                for (let i = 0; i < options.links.length; i++) {
                    links.push(createButtonLink(
                        options.links[i].type,
                        options.links[i].name
                    ))
                }

                if (!options.type) {
                    options.text = sprintf(options.text, links)
                } else {
                    options.text = sprintf(farmOverflow.lang.events[options.type], links)
                }
            }

            let $tr = document.createElement('tr')

            $tr.className = 'reduced'
            $tr.innerHTML = TemplateEngine('___htmlFarmEvent', {
                date: $filter('readableDateFilter')(options.timestamp || $timeHelper.gameTime()),
                icon: options.icon,
                text: options.text
            })

            if (!options.icon) {
                $tr.querySelector('.icon-bg-black').remove()
                $tr.querySelector('.text-tribe-news').className = ''
            }

            if (options.links) {
                for (let i = 0; i < links.length; i++) {
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
            let selected = farmOverflow.village

            if (!selected) {
                $selected.html(farmOverflow.lang.general.none)

                return false
            }

            let village = createButtonLink(
                'village',
                `${selected.name} (${selected.x}|${selected.y})`,
                farmOverflow.village.id
            )

            $selected.html('')
            $selected.append(village.elem)
        }

        /**
         * Popula a lista de eventos que foram gerados em outras execuções
         * do FarmOverflow.
         */
        function populateEvents () {
            let settings = farmOverflow.settings
            
            // Caso tenha algum evento, remove a linha inicial "Nada aqui ainda"
            if (events.length > 0) {
                $events.html('')
            }

            for (let i = 0; i < events.length; i++) {
                if (visibleEventCount >= settings.eventsLimit) {
                    break
                }

                let event = events[i]

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
            let types = ['groupIgnore', 'groupInclude', 'groupOnly']
            let groups = $model.getGroupList().getGroups()

            for (let type in $groups) {
                $groups[type].html(
                    `<option value="">${farmOverflow.lang.general.disabled}</option>`
                )

                for (let id in groups) {
                    let name = groups[id].name
                    let selected = ''

                    if (farmOverflow.settings[type] == id) {
                        selected = 'selected'
                    }

                    $groups[type].append(
                        `<option value="${id}" ${selected}>${name}</option>`
                    )
                }
            }
        }

        /**
         * Atualiza a lista de presets na aba de configurações.
         */
        function updatePresetList () {
            let loaded = {}
            let presets = $model.getPresetList().presets
            
            $preset.html(
                `<option value="">${farmOverflow.lang.general.disabled}</option>`
            )

            for (let id in presets) {
                let cleanName = presets[id].name.replace(rpreset, '').trim()

                if (cleanName in loaded) {
                    continue
                }

                // presets apenas com descrição sem identificação são ignorados
                if (!cleanName) {
                    continue
                }

                let selected = ''

                if (farmOverflow.settings.presetName === cleanName) {
                    selected = 'selected'
                }

                $preset.append(
                    `<option value="${cleanName}" ${selected}>${cleanName}</option>`
                )

                loaded[cleanName] = true
            }
        }

        function updateQuickview () {
            let last = farmOverflow.lang.events.lastAttack
            
            return last + ': ' + $last.html()
        }

        let farmInterface = new Interface('farmOverflow-farm', {
            activeTab: 'info',
            htmlTemplate: '___htmlFarmWindow',
            htmlReplaces: angular.merge({
                version: farmOverflow.version,
                author: ___author
            }, farmOverflow.lang)
        })

        let farmButton = new FrontButton({
            label: 'Farm',
            classHover: 'farmOverflow-show-status',
            classBlur: 'farmOverflow-hide-status',
            hoverText: updateQuickview
        })

        let $window = $(farmInterface.$window)

        let $settings = $window.find('.settings')
        let $save = $window.find('.save')
        let $start = $window.find('.start')
        let $preset = $window.find('.preset')
        let $selected = $window.find('.selected')
        let $events = $window.find('.events')
        let $status = $window.find('.status')
        let $last = $window.find('.last')
        let $groups = {
            groupIgnore: $window.find('.ignore'),
            groupInclude: $window.find('.include'),
            groupOnly: $window.find('.only')
        }

        let events = Lockr.get('lastEvents', [], true)
        let visibleEventCount = 1

        bindSettings()
        bindEvents()
        updateGroupList()
        updateSelectedVillage()
        updateLastAttack()
        populateEvents()

        if ($presetList.isLoaded()) {
            updatePresetList()
        }

        farmOverflow.on('groupsChanged', () => {
            updateGroupList()
        })

        farmOverflow.on('presetsLoaded', () => {
            updatePresetList()
        })

        farmOverflow.on('presetsChange', () => {
            updatePresetList()
        })

        farmButton.click(() => {
            farmInterface.openWindow()
        })

        $start.on('click', () => {
            farmOverflow.switch()
        })

        $hotkeys.add(farmOverflow.settings.hotkeySwitch, () => {
            farmOverflow.switch()
        })

        $hotkeys.add(farmOverflow.settings.hotkeyWindow, () => {
            farmInterface.openWindow()
        })

        farmOverflow.on('start', () => {
            $start.html(farmOverflow.lang.general.pause)
            $start.removeClass('btn-green').addClass('btn-red')
            farmButton.$elem.removeClass('btn-green').addClass('btn-red')
        })

        farmOverflow.on('pause', () => {
            $start.html(farmOverflow.lang.general.start)
            $start.removeClass('btn-red').addClass('btn-green')
            farmButton.$elem.removeClass('btn-red').addClass('btn-green')
        })
    }
})
