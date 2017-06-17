define('FarmOverflow/Queue', [
    'conf/unitTypes',
    'helper/time',
    'helper/math'
], function (UNITS, $timeHelper, $math) {
    var errorCallback = function () {}
    var addCallback = function () {}
    var removeCallback = function () {}
    var sendCallback = function () {}
    var startCallback = function () {}
    var stopCallback = function () {}
    var expiredCallback = function () {}

    var i18n = $filter('i18n')
    var readableMillisecondsFilter = $filter('readableMillisecondsFilter')
    var readableDateFilter = $filter('readableDateFilter')

    var queue = []
    var index = 0
    var running = false

    function joinTroopsLog (units) {
        var troops = []

        for (var unit in units) {
            troops.push(unit + ': ' + units[unit]);
        }

        return troops.join(',')
    }

    function joinOfficersLog (officers) {
        var string = []

        for (var officer in officers) {
            string.push(officer)
        }

        return string.join(', ')
    }

    function updateVillageData (command, prop, _callback) {
        var coords = command[prop].coords.split('|').map(function (coord) {
            return parseInt(coord, 10)
        })

        $autoCompleteService.villageByCoordinates({
            x: coords[0],
            y: coords[1]
        }, function (villageData) {
            command[prop].id = villageData.id
            command[prop].name = villageData.name

            _callback && _callback(villageData)
        })
    }

    function checkCoords (xy) {
        return /\d{3}\|\d{3}/.test(xy)
    }

    function checkUnits (units) {
        for (var u in units) {
            return true
        }

        return false
    }

    function cleanZeroUnits (units) {
        var cleanUnits = {}

        for (var unit in units) {
            var amount = parseInt(units[unit], 10)

            if (amount > 0) {
                cleanUnits[unit] = amount
            }
        }

        return cleanUnits
    }

    function checkArriveTime (sendTime) {
        if ($timeHelper.gameTime() > sendTime) {
            return false
        }

        return true
    }

    function orderQueue () {
        queue = queue.sort(function (a, b) {
            return a.sendTime - b.sendTime
        })
    }

    function getTravelTime (origin, target, units, type, officers) {
        var army = {
            units: units,
            officers: officers
        }

        var travelTime = $armyService.calculateTravelTime(army, {
            barbarian: false,
            ownTribe: false,
            officers: officers,
            effects: false
        })

        origin = origin.split('|')
        target = target.split('|')

        var distance = $math.actualDistance({
            x: origin[0],
            y: origin[1]
        }, {
            x: target[0],
            y: target[1]
        })

        var totalTravelTime = $armyService.getTravelTimeForDistance(
            army,
            travelTime,
            distance,
            type
        )

        return totalTravelTime * 1000
    }

    function sendCommand (command) {
        $socket.emit($route.SEND_CUSTOM_ARMY, {
            start_village: command.origin.id,
            target_village: command.target.id,
            type: command.type,
            units: command.units,
            icon: 0,
            officers: command.officers,
            catapult_target: null
        })

        sendCallback(command)
    }

    function onError (fn) {
        errorCallback = fn
    }

    function onAdd (fn) {
        addCallback = fn
    }

    function onRemove (fn) {
        removeCallback = fn
    }

    function onSend (fn) {
        sendCallback = fn
    }

    function onStart (fn) {
        startCallback = fn
    }

    function onStop (fn) {
        stopCallback = fn
    }

    function onExpired (fn) {
        expiredCallback = fn
    }

    function add (command) {
        if (!command.origin || !command.target) {
            return errorCallback('Origin/target has errors.')
        }

        if (!checkCoords(command.origin)) {
            return errorCallback('Origin coords format ' + origin + ' is invalid.')
        }

        if (!checkCoords(command.target)) {
            return errorCallback('Origin coords format ' + target + ' is invalid.')
        }

        if (!checkUnits(command.units)) {
            return errorCallback('You need to specify an amount of units.')
        }

        command.units = cleanZeroUnits(command.units)

        var arriveTime = new Date(command.arrive).getTime()
        var travelTime = getTravelTime(command.origin, command.target, command.units, command.type)
        var sendTime = arriveTime - travelTime

        if (!checkArriveTime(sendTime)) {
            return errorCallback('This command should have already exited.')
        }

        // transform "true" to 1 because the game do like that
        for (var officer in command.officers) {
            command.officers[officer] = 1
        }

        command.id = index++
        command.sendTime = sendTime
        command.travelTime = travelTime
        command.origin = { coords: command.origin, name: null, id: null }
        command.target = { coords: command.target, name: null, id: null }

        var checkVillages = new Promise(function (resolve, reject) {
            var success = 0

            updateVillageData(command, 'origin', function (villageData) {
                if (!villageData.hasOwnProperty('id')) {
                    reject('Origin village does not exist.')
                } else if (++success === 2) {
                    resolve()
                }
            })

            updateVillageData(command, 'target', function (villageData) {
                if (!villageData.hasOwnProperty('id')) {
                    reject('Target village does not exist.')
                } else if (++success === 2) {
                    resolve()
                }
            })
        })

        checkVillages.then(function () {
            queue.push(command)
            orderQueue()

            addCallback(command)
        })

        checkVillages.catch(function (error) {
            errorCallback(error)
        })
    }

    function remove (id, reason) {
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].id == id) {
                queue.splice(i, i + 1)

                if (reason === 'expired') {
                    expiredCallback(id)
                } else {
                    removeCallback(true, id)
                }

                return false
            }
        }

        removeCallback(false)
    }

    function expiredCommand (id) {
        remove(id, 'expired')
    }

    function listener () {
        setInterval(function () {
            var gameTime = $timeHelper.gameTime()
            var command
            var i

            if (!queue.length) {
                return false
            }

            for (i = 0; i < queue.length; i++) {
                if (queue[i].sendTime - gameTime < 0) {
                    if (running) {
                        sendCommand(queue[i])
                    } else {
                        expiredCommand(queue[i].id)
                    }
                } else {
                    break
                }
            }

            if (i) {
                queue.splice(0, i)
            }
        }, 150)
    }

    function start () {
        running = true
        startCallback()
    }

    function stop () {
        running = false
        stopCallback()
    }

    function isRunning () {
        return !!running
    }

    listener()

    return {
        version: '0.1.0',
        add: add,
        remove: remove,
        onError: onError,
        onAdd: onAdd,
        onRemove: onRemove,
        onSend: onSend,
        onStart: onStart,
        onStop: onStop,
        onExpired: onExpired,
        start: start,
        stop: stop,
        isRunning: isRunning
    }
})
