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
    var ui
    var opener
    var $window
    var $switch
    var $addForm
    var $origin
    var $target
    var $arrive
    var $sections
    var $travelTimes
    var $travelTimeUnits = {}

    var validOrigin = false
    var validTarget = false
    var validArrive = false

    var officerNames = $model.getGameData().getOrderedOfficerNames()
    var unitNames = $model.getGameData().getOrderedUnitNames()
    var unitNamesNoCatapult = unitNames.filter(function (name) {
        return name !== 'catapult'
    })
    var unitNamesCategory = ['knight', 'heavy_cavalry', 'axe', 'sword', 'ram', 'snob', 'trebuchet']

    var rdateTime = /\s*\d{1,2}:\d{1,2}:\d{1,2}(:\d{1,3})? \d{1,2}\/\d{1,2}\/\d{4}\s*/

    function QueueInterface () {
        ui = new Interface('farmOverflow-queue', {
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

        opener = new FrontButton('Queue')

        opener.hover(function () {
            var commands = Queue.getWaitingCommands()
            var sendTime = commands.length
                ? readableDateFilter(commands[0].sendTime)
                : QueueLocale('general.none')
            var text = QueueLocale('general.nextCommand') + ': ' + sendTime

            opener.updateQuickview(text)
        })

        $window = $(ui.$window)
        $switch = $window.find('a.switch')
        $addForm = $window.find('form.addForm')
        $origin = $window.find('input.origin')
        $target = $window.find('input.target')
        $arrive = $window.find('input.arrive')
        $travelTimes = $window.find('table.travelTimes')
        $sections = {
            queue: $window.find('div.queue'),
            sended: $window.find('div.sended'),
            expired: $window.find('div.expired')
        }

        $travelTimes.find('.travelTime').forEach(function ($elem) {
            var unit = $elem.getAttribute('unit')
            
            $travelTimeUnits[unit] = $elem
        })

        opener.click(function () {
            ui.openWindow()
        })

        Queue.bind('error', function (error) {
            emitNotif('error', error)
        })

        Queue.bind('remove', function (removed, command) {
            if (!removed) {
                return emitNotif('error', QueueLocale('error.removeError'))
            }

            removeCommandItem(command, 'queue')
            emitNotif('success', genNotifText(command.type, 'removed', 'general'))
        })

        Queue.bind('expired', function (command) {
            removeCommandItem(command, 'queue')
            addCommandItem(command, 'expired')
            emitNotif('error', genNotifText(command.type, 'expired', 'general'))
        })

        Queue.bind('add', function (command) {
            addCommandItem(command, 'queue')
            emitNotif('success', genNotifText(command.type, 'added', 'general'))
        })

        Queue.bind('send', function (command) {
            removeCommandItem(command, 'queue')
            addCommandItem(command, 'sended')
            emitNotif('success', genNotifText(command.type, 'sended', 'general'))
        })

        Queue.bind('start', function (firstRun) {
            opener.$elem.removeClass('btn-green').addClass('btn-red')

            $switch.removeClass('btn-green').addClass('btn-red')
            $switch.html(QueueLocale('general.deactivate'))

            if (!firstRun) {
                emitNotif('success', genNotifText('title', 'activated'))
            }
        })

        Queue.bind('stop', function () {
            opener.$elem.removeClass('btn-red').addClass('btn-green')
            
            $switch.removeClass('btn-red').addClass('btn-green')
            $switch.html(QueueLocale('general.activate'))

            emitNotif('success', genNotifText('title', 'deactivated'))
        })

        setInterval(function () {
            if (ui.isVisible() && ui.activeTab === 'add' && validOrigin && validTarget && validArrive) {
                calcTravelTimes()
            }
        }, 1000)

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

        return hour + ':' + min + ':' + sec + ':' + ms + ' ' + day + '/' + month + '/' + year
    }

    function bindAdd () {
        var inputsMap = ['origin', 'target', 'arrive'].concat(unitNames, officerNames)
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
            $origin.val(pos.x + '|' + pos.y)
            $origin.trigger('input')
        })

        $window.find('a.addMapSelected').on('click', function () {
            if (!mapSelectedVillage) {
                return emitNotif('error', QueueLocale('error.noMapSelectedVillage'))
            }

            $target.val(mapSelectedVillage.join('|'))
            $target.trigger('input')
        })

        $window.find('a.addCurrentDate').on('click', function () {
            var now = dateToString($timeHelper.gameDate())
            $arrive.val(now)
            $arrive.trigger('input')
        })

        $origin.on('input', function () {
            validOrigin = isValidCoords($origin.val())
            calcTravelTimes()
        })

        $target.on('input', function () {
            validTarget = isValidCoords($target.val())
            calcTravelTimes()
        })

        $arrive.on('input', function () {
            validArrive = rdateTime.test($arrive.val())
            checkArriveValidity()
            calcTravelTimes()
        })

        $root.$on($eventType.SHOW_CONTEXT_MENU, function (event, menu) {
            mapSelectedVillage = [menu.data.x, menu.data.y]
        })

        $root.$on($eventType.DESTROY_CONTEXT_MENU, function () {
            mapSelectedVillage = false
        })
    }

    function calcTravelTimes () {
        if (!validOrigin || !validTarget) {
            return $travelTimes.hide()
        }

        var origin = $origin.val()
        var target = $target.val()

        unitNamesCategory.forEach(function (unit) {
            var units = {}
            var officers = getOfficers()

            units[unit] = 1

            var travelTime = Queue.getTravelTime(origin, target, units, 'attack', officers)
            var readable = readableMillisecondsFilter(travelTime)

            if (validArrive) {
                var arrive = fixDate($arrive.val())
                var arriveTime = new Date(arrive).getTime()
                var sendTime = arriveTime - travelTime

                if (!isValidDateTime(sendTime)) {
                    readable = '<span class="text-red">' + readable + '</span>'
                }
            } else {
                readable = '<span class="text-red">' + readable + '</span>'
            }

            $travelTimeUnits[unit].innerHTML = readable
        })

        $travelTimes.css('display', '')
    }

    function toggleEmptyMessage (section) {
        var $where = $sections[section]
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

        var origin = buttonLink('village', villageLabel(command.origin), command.origin.id)
        var target = buttonLink('village', villageLabel(command.target), command.target.id)

        var typeClass = command.type === 'attack' ? 'attack-small' : 'support'
        var arrive = readableDateFilter(command.sendTime + command.travelTime)
        var sendTime = readableDateFilter(command.sendTime)
        var hasOfficers = !!Object.keys(command.officers).length

        $command.innerHTML = ejs.render('___htmlQueueCommand', {
            sendTime: sendTime,
            typeClass: typeClass,
            arrive: arrive,
            units: command.units,
            hasOfficers: hasOfficers,
            officers: command.officers,
            section: section,
            locale: QueueLocale
        })

        $command.querySelector('.origin').replaceWith(origin.elem)
        $command.querySelector('.target').replaceWith(target.elem)

        if (section === 'queue') {
            var $remove = $command.querySelector('.remove-command')

            $remove.addEventListener('click', function (event) {
                Queue.removeCommand(command, 'removed')
            })
        }

        $sections[section].append($command)

        toggleEmptyMessage(section)
    }

    function removeCommandItem (command, section) {
        var $command = document.getElementById(section + '-' + command.id)

        if ($command) {
            $command.remove()
        }

        toggleEmptyMessage(section)
        ui.$scrollbar.recalc()
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

    function genNotifText(key, key2, prefix) {
        if (prefix) {
            key = prefix + '.' + key
        }

        return QueueLocale(key) + ' ' + QueueLocale(key2)
    }

    function isValidDateTime (time) {
        if ($timeHelper.gameTime() > time) {
            return false
        }

        return true
    }

    function checkArriveValidity () {
        var valid = rdateTime.test($arrive.val())
        
        $arrive.css('color', valid ? '' : '#a1251f')
    }

    function getOfficers () {
        var officers = {}

        officerNames.forEach(function (officer) {
            var $input = $addForm.find('[name="' + officer + '"]')
            
            if ($input.val()) {
                officers[officer] = true
            }
        })

        return officers
    }

    return QueueInterface
})
