define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Queue',
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton',
    'helper/time'
], function (
    Queue,
    Interface,
    FrontButton,
    $timeHelper
) {
    return function () {
        var readableDateFilter = $filter('readableDateFilter')
        var unitNames = $model.getGameData().getOrderedUnitNames()
        var officerNames = $model.getGameData().getOrderedOfficerNames()

        function genUnitsInput () {
            var wrapper = ['<tr>']

            unitNames.forEach(function (unit, index) {
                if (index % 2 === 0 && index !== 0) {
                    wrapper.push('</tr><tr>')
                }

                var name = $filter('i18n')(unit, $root.loc.ale, 'unit_names')

                wrapper.push(
                    '<td class="cell-space-left">',
                    '<span class="float-left icon-bg-black icon-44x44-unit-' + unit + '"></span>',
                    '<div class="ff-cell-fix cell-space-44x44">',
                    '<span class="ng-binding">' + name + '</span>',
                    '<input class="unit" type="number" name="' + unit + '" placeholder="0">',
                    '</div>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
        }

        function genOfficersInput () {
            var wrapper = ['<tr>']
            
            officerNames.forEach(function (officer, index) {
                var name = $filter('i18n')(officer, $root.loc.ale, 'officer_names')

                wrapper.push(
                    '<td>',
                    '<span class="icon-44x44-premium_officer_' + officer + '"></span>',
                    '<label class="size-34x34 btn-orange icon-26x26-checkbox">',
                    '<input type="checkbox" name="' + officer + '">',
                    '</label>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
        }

        function isUnit (value) {
            return unitNames.includes(value)
        }

        function isOfficer (value) {
            return officerNames.includes(value)
        }

        function zeroPad (number, width) {
            number = number + ''

            return number.length >= width
                ? number
                : new Array(width - number.length + 1).join('0') + number
        }

        function dateToString (date) {
            var ms = zeroPad(date.getMilliseconds(), 3)
            var sec = zeroPad(date.getSeconds(), 2)
            var min = zeroPad(date.getMinutes(), 2)
            var hour = zeroPad(date.getHours(), 2)
            var day = zeroPad(date.getDate(), 2)
            var month = zeroPad(date.getMonth() + 1, 2)
            var year = date.getFullYear()

            return hour + ':' + min + ':' + sec + ':' + ms + ' ' + month + '/' + day + '/' + year
        }

        function bindAdd () {
            var commandType = 'attack'

            $addForm.on('submit', function (event) {
                event.preventDefault()

                if (!$addForm[0].checkValidity()) {
                    return false
                }

                var command = {
                    units: {},
                    officers: {},
                    type: commandType
                }

                inputsMap.forEach(function (name) {
                    var $input = $addForm.find('[name="' + name + '"]')
                    var value = $input.val()

                    if ($input[0].type === 'number') {
                        value = parseInt(value, 10)
                    }

                    if (!value) {
                        return false
                    }

                    if (isUnit(name)) {
                        return command.units[name] = value
                    }

                    if (isOfficer(name)) {
                        return command.officers[name] = value
                    }

                    command[name] = value
                })

                Queue.addCommand(command)
            })

            $officers.on('click', function () {
                $(this).parent().toggleClass(inputCheckedClass)
            })

            $switch.on('click', function (event) {
                if (Queue.isRunning()) {
                    Queue.stop()
                } else {
                    Queue.start()
                }
            })

            $addAttack.on('click', function (event) {
                commandType = 'attack'
                $addForm.find('input:submit')[0].click()
            })

            $addSupport.on('click', function (event) {
                commandType = 'support'
                $addForm.find('input:submit')[0].click()
            })

            $clearRegisters.on('click', function (event) {
                clearRegisters()
            })

            $addSelected.on('click', function () {
                var pos = $model.getSelectedVillage().getPosition()
                $origin.val(pos.x + '|' + pos.y)
            })

            $addCurrentDate.on('click', function () {
                var now = dateToString($timeHelper.gameDate())
                $arrive.val(now)
            })
        }

        function showEmptyMessage (section) {
            var $where = $commandSections[section]
            var $msg = $where.find('p.nothing')

            if (section === 'queue') {
                if (Queue.getCommands().length === 0) {
                    $msg.css('display', '')
                }
            } else {
                if ($where.find('div').length === 0) {
                    $msg.css('display', '')
                }
            }
        }

        function hideEmptyMessage (section) {
            var $where = $commandSections[section]
            var $msg = $where.find('p.nothing')

            if (section === 'queue') {
                if (Queue.getCommands().length > 0) {
                    $msg.css('display', 'none')
                }
            } else {
                if ($where.find('div').length > 0) {
                    $msg.css('display', 'none')
                }
            }
        }

        function addCommandItem (command, section) {
            var $command = document.createElement('div')
            $command.id = section + '-' + command.id

            var originLabel = command.origin.name + ' (' + command.origin.coords + ')'
            var origin = createButtonLink('village', originLabel, command.origin.id)

            var targetLabel = command.target.name + ' (' + command.target.coords + ')'
            var target = createButtonLink('village', targetLabel, command.target.id)

            var typeClass = command.type === 'attack' ? 'attack-small' : 'support'
            var arrive = readableDateFilter(command.sendTime + command.travelTime)
            var sendTime = readableDateFilter(command.sendTime)

            $command.innerHTML = TemplateEngine('___htmlQueueCommand', {
                sendTime: sendTime,
                origin: origin.html,
                target: target.html,
                typeClass: typeClass,
                arrive: arrive,
                units: command.units,
                officers: command.officers,
                section: section,
                lang: {
                    out: 'Saída',
                    timeLeft: 'Tempo restante',
                    village: 'Aldeia',
                    arrive: 'Chegada',
                    units: 'Tropas',
                    officers: 'Oficiais'
                }
            })

            var $originButton = $command.querySelector('#' + origin.id)
            var $targetButton = $command.querySelector('#' + target.id)

            $originButton.addEventListener('click', function () {
                $wds.openVillageInfo(command.origin.id)
            })

            $targetButton.addEventListener('click', function () {
                $wds.openVillageInfo(command.target.id)
            })

            if (section === 'queue') {
                var $remove = $command.querySelector('.remove-command')

                $remove.addEventListener('click', function (event) {
                    Queue.removeCommand(command, 'removed')
                })
            }

            $commandSections[section].append($command)

            hideEmptyMessage(section)
        }

        function removeCommandItem (command, section) {
            var $command = document.getElementById(section + '-' + command.id)

            if ($command) {
                $command.remove()
            }

            showEmptyMessage(section)
        }

        function showStoredCommands () {
            var queueCommands = Queue.getCommands()
            var sendedCommands = Queue.getSended()
            var expiredCommands = Queue.getExpired()

            if (queueCommands.length) {
                for (var i = 0; i < queueCommands.length; i++) {
                    addCommandItem(queueCommands[i], 'queue')
                }
            }

            if (sendedCommands.length) {
                for (var i = 0; i < sendedCommands.length; i++) {
                    addCommandItem(sendedCommands[i], 'sended')
                }
            }

            if (expiredCommands.length) {
                for (var i = 0; i < expiredCommands.length; i++) {
                    addCommandItem(expiredCommands[i], 'expired')
                }
            }
        }

        function clearRegisters () {
            var sendedCommands = Queue.getSended()
            var expiredCommands = Queue.getExpired()

            if (sendedCommands.length) {
                for (var i = 0; i < sendedCommands.length; i++) {
                    removeCommandItem(sendedCommands[i], 'sended')
                }
            }

            if (expiredCommands.length) {
                for (var i = 0; i < expiredCommands.length; i++) {
                    removeCommandItem(expiredCommands[i], 'expired')
                }
            }

            Queue.clearRegisters()
        }

        function updateQuickview () {
            var commands = Queue.getCommands()
            var sendTime = !commands.length
                ? 'nenhum'
                : $filter('readableDateFilter')(commands[0].sendTime)

            return 'Próximo comando: ' + sendTime
        }

        var queueInterface = new Interface('farmOverflow-queue', {
            activeTab: 'info',
            htmlTemplate: '___htmlQueueWindow',
            htmlReplaces: {
                version: Queue.version,
                author: ___author,
                title: 'CommandQueue',
                unitsInput: genUnitsInput(),
                officersInput: genOfficersInput()
            }
        })

        var queueButton = new FrontButton({
            label: 'Queue',
            classHover: 'expand-button',
            classBlur: 'contract-button',
            hoverText: updateQuickview
        })

        var $window = $(queueInterface.$window)

        var $addForm = $window.find('form.addForm')
        var $addAttack = $window.find('a.attack')
        var $addSupport = $window.find('a.support')
        var $switch = $window.find('a.switch')
        var $clearRegisters = $window.find('a.clear')
        var $addSelected = $window.find('a.addSelected')
        var $addCurrentDate = $window.find('a.addCurrentDate')
        var $origin = $window.find('input.origin')
        var $arrive = $window.find('input.arrive')
        var $officers = $window.find('table.officers input')
        var $commandSections = {
            queue: $window.find('div.queue'),
            sended: $window.find('div.sended'),
            expired: $window.find('div.expired')
        }

        var inputsMap = ['origin', 'target', 'arrive']
            .concat($model.getGameData().getOrderedUnitNames())
            .concat($model.getGameData().getOrderedOfficerNames())

        queueButton.click(function () {
            queueInterface.openWindow()
        })

        Queue.bind('error', function (error) {
            emitNotif('error', error)
        })

        Queue.bind('remove', function (removed, command) {
            if (!removed) {
                return emitNotif('error', 'Nenhum comando foi removido!')
            }

            removeCommandItem(command, 'queue')
            emitNotif('success', 'Comando #' + command.id + ' foi removido!')
        })

        Queue.bind('expired', function (command) {
            removeCommandItem(command, 'queue')
            addCommandItem(command, 'expired')
            emitNotif('error', 'Comando #' + command.id + ' expirou! Planeador está desativado!')
        })

        Queue.bind('add', function (command) {
            addCommandItem(command, 'queue')
            emitNotif('success', 'Comando adicionado!')
        })

        Queue.bind('send', function (command) {
            removeCommandItem(command, 'queue')
            addCommandItem(command, 'sended')
            emitNotif('success', 'Comando #' + command.id + ' foi enviado!')
        })

        Queue.bind('start', function (firstRun) {
            queueButton.$elem.removeClass('btn-green').addClass('btn-red')

            $switch.removeClass('btn-green').addClass('btn-red')
            $switch.html('Desativar')

            if (!firstRun) {
                emitNotif('success', 'CommandQueue está ativado!')
            }
        })

        Queue.bind('stop', function () {
            queueButton.$elem.removeClass('btn-red').addClass('btn-green')
            
            $switch.removeClass('btn-red').addClass('btn-green')
            $switch.html('Ativar')

            emitNotif('success', 'CommandQueue está desativado!')
        })

        bindAdd()
        showStoredCommands()
    }
})
