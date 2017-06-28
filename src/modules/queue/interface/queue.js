define('TWOverflow/Queue/interface', [
    'TWOverflow/Queue',
    'TWOverflow/Queue/locale',
    'TWOverflow/Interface',
    'TWOverflow/Interface/buttonLink',
    'TWOverflow/FrontButton',
    'helper/time',
    'ejs'
], function (
    Queue,
    QueueLocale,
    Interface,
    buttonLink,
    FrontButton,
    $timeHelper,
    ejs
) {
    var queueInterface
    var queueButton
    var $window
    var $switch
    var $commandSections
    var readableDateFilter = $filter('readableDateFilter')
    var unitNames = $model.getGameData().getOrderedUnitNames()
    var officerNames = $model.getGameData().getOrderedOfficerNames()
    var inputsMap = ['origin', 'target', 'arrive']
        .concat($model.getGameData().getOrderedUnitNames())
        .concat($model.getGameData().getOrderedOfficerNames())

    function QueueInterface () {
        var unitNamesNoCatapult = unitNames.filter(function (unit) {
            return unit !== 'catapult'
        })

        queueInterface = new Interface('farmOverflow-queue', {
            activeTab: 'info',
            css: '___cssQueue',
            template: '___htmlQueueWindow',
            replaces: {
                version: Queue.version,
                locale: QueueLocale,
                unitNameFilter: unitNameFilter,
                units: unitNamesNoCatapult,
                officers: officerNames
            }
        })

        queueButton = new FrontButton({
            label: 'Queue',
            classHover: 'expand-button',
            classBlur: 'contract-button',
            hoverText: updateQuickview
        })

        $window = $(queueInterface.$window)
        $switch = $window.find('a.switch')
        $commandSections = {
            queue: $window.find('div.queue'),
            sended: $window.find('div.sended'),
            expired: $window.find('div.expired')
        }

        queueButton.click(function () {
            queueInterface.openWindow()
        })

        Queue.bind('error', function (error) {
            emitNotif('error', error)
        })

        Queue.bind('remove', function (removed, command) {
            if (!removed) {
                return emitNotif('error', QueueLocale('error.removeError'))
            }

            var commandType = QueueLocale('general.' + command.type)

            removeCommandItem(command, 'queue')
            emitNotif('success', commandType + ' ' + QueueLocale('removed'))
        })

        Queue.bind('expired', function (command) {
            var commandType = QueueLocale('general.' + command.type)

            removeCommandItem(command, 'queue')
            addCommandItem(command, 'expired')
            emitNotif('error', commandType + ' ' + QueueLocale('expired'))
        })

        Queue.bind('add', function (command) {
            var commandType = QueueLocale('general.' + command.type)

            addCommandItem(command, 'queue')
            emitNotif('success', commandType + ' ' + QueueLocale('added'))
        })

        Queue.bind('send', function (command) {
            var commandType = QueueLocale('general.' + command.type)

            removeCommandItem(command, 'queue')
            addCommandItem(command, 'sended')
            emitNotif('success', commandType + ' ' + QueueLocale('sended'))
        })

        Queue.bind('start', function (firstRun) {
            queueButton.$elem.removeClass('btn-green').addClass('btn-red')

            $switch.removeClass('btn-green').addClass('btn-red')
            $switch.html(QueueLocale('general.deactivate'))

            if (!firstRun) {
                emitNotif('success', QueueLocale('title') + ' ' + QueueLocale('activated'))
            }
        })

        Queue.bind('stop', function () {
            queueButton.$elem.removeClass('btn-red').addClass('btn-green')
            
            $switch.removeClass('btn-red').addClass('btn-green')
            $switch.html(QueueLocale('general.activate'))

            emitNotif('success', QueueLocale('title') + ' ' + QueueLocale('deactivated'))
        })

        bindAdd()
        showStoredCommands()
    }

    function unitNameFilter (unit) {
        return $filter('i18n')(unit, $root.loc.ale, 'unit_names')
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
        var $addForm = $window.find('form.addForm')
        var mapSelectedVillage = false
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

                if ($input[0].className === 'unit') {
                    if (isNaN(value) && value !== '*') {
                        return false
                    }

                    value = isNaN(value) ? value : parseInt(value, 10)
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

        $window.find('table.officers input').on('click', function () {
            $(this).parent().toggleClass('icon-26x26-checkbox-checked')
        })

        $switch.on('click', function (event) {
            if (Queue.isRunning()) {
                Queue.stop()
            } else {
                Queue.start()
            }
        })

        $window.find('a.attack').on('click', function (event) {
            commandType = 'attack'
            $addForm.find('input:submit')[0].click()
        })

        $window.find('a.support').on('click', function (event) {
            commandType = 'support'
            $addForm.find('input:submit')[0].click()
        })

        $window.find('a.clear').on('click', function (event) {
            clearRegisters()
        })

        $window.find('a.addSelected').on('click', function () {
            var pos = $model.getSelectedVillage().getPosition()
            $window.find('input.origin').val(pos.x + '|' + pos.y)
        })

        $window.find('a.addMapSelected').on('click', function () {
            if (!mapSelectedVillage) {
                return emitNotif('error', QueueLocale('error.noMapSelectedVillage'))
            }

            $window.find('input.target').val(mapSelectedVillage.join('|'))
        })

        $window.find('a.addCurrentDate').on('click', function () {
            var now = dateToString($timeHelper.gameDate())
            $window.find('input.arrive').val(now)
        })

        $root.$on($eventType.SHOW_CONTEXT_MENU, function (event, menu) {
            mapSelectedVillage = [menu.data.x, menu.data.y]
        })

        $root.$on($eventType.DESTROY_CONTEXT_MENU, function () {
            mapSelectedVillage = false
        })
    }

    function toggleEmptyMessage (section) {
        var $where = $commandSections[section]
        var $msg = $where.find('p.nothing')

        var condition = section === 'queue'
            ? Queue.getWaitingCommands()
            : $where.find('div')

        $msg.css('display', condition.length === 0 ? '' : 'none')
    }

    function addCommandItem (command, section) {
        var $command = document.createElement('div')
        $command.id = section + '-' + command.id
        $command.className = 'command'

        var originLabel = command.origin.name + ' (' + command.origin.coords + ')'
        var origin = buttonLink('village', originLabel, command.origin.id)

        var targetLabel = command.target.name + ' (' + command.target.coords + ')'
        var target = buttonLink('village', targetLabel, command.target.id)

        var typeClass = command.type === 'attack' ? 'attack-small' : 'support'
        var arrive = readableDateFilter(command.sendTime + command.travelTime)
        var sendTime = readableDateFilter(command.sendTime)
        var hasOfficers = !!Object.keys(command.officers).length

        $command.innerHTML = ejs.render('___htmlQueueCommand', {
            sendTime: sendTime,
            origin: origin.html,
            target: target.html,
            typeClass: typeClass,
            arrive: arrive,
            units: command.units,
            hasOfficers: hasOfficers,
            officers: command.officers,
            section: section,
            locale: QueueLocale
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

        toggleEmptyMessage(section)
    }

    function removeCommandItem (command, section) {
        var $command = document.getElementById(section + '-' + command.id)

        if ($command) {
            $command.remove()
        }

        toggleEmptyMessage(section)
        queueInterface.$scrollbar.recalc()
    }

    function showStoredCommands () {
        var queueCommands = Queue.getWaitingCommands()
        var sendedCommands = Queue.getSendedCommands()
        var expiredCommands = Queue.getExpiredCommands()

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
        var sendedCommands = Queue.getSendedCommands()
        var expiredCommands = Queue.getExpiredCommands()

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
        var commands = Queue.getWaitingCommands()
        var sendTime = !commands.length
            ? 'nenhum'
            : $filter('readableDateFilter')(commands[0].sendTime)

        return QueueLocale('general.nextCommand') + ': ' + sendTime
    }

    return QueueInterface
})
