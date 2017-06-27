define('FarmOverflow/Queue/locale', [
    'FarmOverflow/locale'
], function (Locale) {
    return new Locale(___langQueue, 'en_us')
})

define('FarmOverflow/Queue', [
    'FarmOverflow/Queue/locale',
    'helper/time',
    'helper/math',
    'Lockr'
], function (
    QueueLocale,
    $timeHelper,
    $math,
    Lockr
) {
    var readableMillisecondsFilter = $filter('readableMillisecondsFilter')
    var readableDateFilter = $filter('readableDateFilter')

    var eventListeners = {}
    var waitingCommands = []
    var sendedCommands = []
    var expiredCommands = []
    var running = false

    // privates

    function guid () {
        return Math.floor((Math.random()) * 0x1000000).toString(16)
    }

    function worldPrefix (id) {
        var wid = $model.getSelectedCharacter().getWorldId()

        return wid + '-' + id
    }

    function getVillageByCoords (coords, callback) {
        coords = coords.split('|').map(function (coord) {
            return parseInt(coord, 10)
        })

        $autoCompleteService.villageByCoordinates({
            x: coords[0],
            y: coords[1]
        }, function (data) {
            callback(data.hasOwnProperty('id') ? data : false)
        })
    }

    function isValidCoords (xy) {
        return /\s*\d{3}\|\d{3}\s*/.test(xy)
    }

    function isValidArriveTime (sendTime) {
        if ($timeHelper.gameTime() > sendTime) {
            return false
        }

        return true
    }

    function cleanZeroUnits (units) {
        var cleanUnits = {}

        for (var unit in units) {
            var amount = units[unit]

            if (amount === '*' || amount !== 0) {
                cleanUnits[unit] = amount
            }
        }

        return cleanUnits
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

    function orderWaitingQueue () {
        waitingCommands = waitingCommands.sort(function (a, b) {
            return a.sendTime - b.sendTime
        })
    }

    function pushWaitinCommand (command) {
        waitingCommands.push(command)
    }

    function pushSendedCommand (command) {
        sendedCommands.push(command)
    }

    function pushExpiredCommand (command) {
        expiredCommands.push(command)
    }

    function storeWaitingQueue () {
        Lockr.set(worldPrefix('queue-commands'), waitingCommands)
    }

    function storeSendedQueue () {
        Lockr.set(worldPrefix('queue-sended'), sendedCommands)
    }

    function storeExpiredQueue () {
        Lockr.set(worldPrefix('queue-expired'), expiredCommands)
    }

    function loadStoredCommands () {
        var storedQueue = Lockr.get(worldPrefix('queue-commands'), [], true)

        if (storedQueue.length) {
            for (var i = 0; i < storedQueue.length; i++) {
                var command = storedQueue[i]

                if ($timeHelper.gameTime() > command.sendTime) {
                    Queue.expireCommand(command)
                } else {
                    pushCommand(command)
                }
            }
        }
    }

    function parseDynamicUnits (command) {
        var playerVillages = $model.getVillages()
        var village = playerVillages[command.origin.id]

        if (!village) {
            return false
        }

        var villageUnits = village.unitInfo.units
        var parsedUnits = {}

        for (var unit in command.units) {
            var amount = command.units[unit]

            if (amount === '*') {
                amount = villageUnits[unit].available

                if (amount === 0) {
                    continue
                }
            } else if (amount < 0) {
                amount = villageUnits[unit].available - Math.abs(amount)

                if (amount < 0) {
                    return false
                }
            }

            parsedUnits[unit] = amount
        }

        return parsedUnits
    }

    // publics

    var Queue = {
        version: '___commandQueueVersion'
    }

    Queue.init = function () {
        loadStoredCommands()

        sendedCommands = Lockr.get(worldPrefix('queue-sended'), [], true)
        expiredCommands = Lockr.get(worldPrefix('queue-expired'), [], true)

        setInterval(function () {
            if (!waitingCommands.length) {
                return false
            }

            var gameTime = $timeHelper.gameTime()

            for (var i = 0; i < waitingCommands.length; i++) {
                if (waitingCommands[i].sendTime - gameTime < 0) {
                    if (running) {
                        Queue.sendCommand(waitingCommands[i])
                    } else {
                        Queue.expireCommand(waitingCommands[i])
                    }
                } else {
                    break
                }
            }
        }, 250)

        window.addEventListener('beforeunload', function (event) {
            if (running && waitingCommands.length) {
                event.returnValue = true
            }
        })
    }

    Queue.trigger = function (event, args) {
        if (eventListeners.hasOwnProperty(event)) {
            eventListeners[event].forEach(function (handler) {
                handler.apply(this, args)
            })
        }
    }

    Queue.bind = function (event, handler) {
        if (!eventListeners.hasOwnProperty(event)) {
            eventListeners[event] = []
        }

        eventListeners[event].push(handler)
    }

    Queue.sendCommand = function (command) {
        command.units = parseDynamicUnits(command)

        if (!command.units) {
            return Queue.trigger('error', [QueueLocale('error.noUnitsEnough')])
        }

        $socket.emit($route.SEND_CUSTOM_ARMY, {
            start_village: command.origin.id,
            target_village: command.target.id,
            type: command.type,
            units: command.units,
            icon: 0,
            officers: command.officers,
            catapult_target: null
        })

        pushSendedCommand(command)
        storeSendedQueue()

        Queue.removeCommand(command, 'sended')
        Queue.trigger('send', [command])
    }

    Queue.expireCommand = function (command) {
        pushExpiredCommand(command)
        storeExpiredQueue()

        Queue.removeCommand(command, 'expired')
    }

    Queue.addCommand = function (command) {
        if (!isValidCoords(command.origin)) {
            return Queue.trigger('error', [QueueLocale('error.origin', {
                origin: command.origin
            })])
        }

        if (!isValidCoords(command.target)) {
            return Queue.trigger('error', [QueueLocale('error.target', {
                target: command.target
            })])
        }

        if (angular.equals(command.units, {})) {
            return Queue.trigger('error', [QueueLocale('error.noUnits')])
        }

        command.origin = command.origin.trim()
        command.target = command.target.trim()
        command.arrive = command.arrive.trim()
        command.units = cleanZeroUnits(command.units)

        var arriveTime = new Date(command.arrive).getTime()
        var travelTime = getTravelTime(command.origin, command.target, command.units, command.type)
        var sendTime = arriveTime - travelTime

        if (!isValidArriveTime(sendTime)) {
            return Queue.trigger('error', [QueueLocale('error.alreadySent', {
                date: readableDateFilter(sendTime),
                type: QueueLocale(command.type)
            })])
        }

        // Originalmente o jogo envia os oficiais por quantidade,
        // mesmo que seja sempre 1.
        for (var officer in command.officers) {
            command.officers[officer] = 1
        }

        command.id = guid()
        command.sendTime = sendTime
        command.travelTime = travelTime

        var getOriginVillage = new Promise(function (resolve, reject) {
            getVillageByCoords(command.origin, function (data) {
                if (!data) {
                    return reject('error.originNotExist')
                }

                data.type = 'origin'
                resolve(data)
            })
        })

        var getTargetVillage = new Promise(function (resolve, reject) {
            getVillageByCoords(command.target, function (data) {
                if (!data) {
                    return reject('error.originNotExist')
                }

                data.type = 'target'
                resolve(data)
            })
        })

        var loadVillagesData = Promise.all([
            getOriginVillage,
            getTargetVillage
        ])
        
        loadVillagesData.then(function (villages) {
            villages.forEach(function (village) {
                command[village.type] = {
                    coords: command[village.type],
                    name: village.name,
                    id: village.id
                }
            })

            pushWaitinCommand(command)
            orderWaitingQueue()
            storeWaitingQueue()

            Queue.trigger('add', [command])
        })
        
        loadVillagesData.catch(function (error) {
            Queue.trigger('error', [QueueLocale(error)])
        })
    }

    Queue.removeCommand = function (command, reason) {
        for (var i = 0; i < waitingCommands.length; i++) {
            if (waitingCommands[i].id == command.id) {
                waitingCommands.splice(i, 1)

                if (reason === 'expired') {
                    Queue.trigger('expired', [command])
                } else if (reason === 'removed') {
                    Queue.trigger('remove', [true, command, true /*manual*/])
                }

                return storeWaitingQueue()
            }
        }

        Queue.trigger('remove', [false])
    }

    Queue.clearRegisters = function () {
        Lockr.set(worldPrefix('queue-expired'), [])
        Lockr.set(worldPrefix('queue-sended'), [])
        expiredCommands = []
        sendedCommands = []
    }

    Queue.start = function (firstRun) {
        running = true
        Queue.trigger('start', [firstRun])
    }

    Queue.stop = function () {
        running = false
        Queue.trigger('stop')
    }

    Queue.isRunning = function () {
        return running
    }

    Queue.getWaitingCommands = function () {
        return waitingCommands
    }

    Queue.getSendedCommands = function () {
        return sendedCommands
    }

    Queue.getExpiredCommands = function () {
        return expiredCommands
    }

    return Queue
})
