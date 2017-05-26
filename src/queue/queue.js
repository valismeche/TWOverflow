define('FarmOverflow/Queue', [
    'conf/unitTypes',
    'helper/time',
    'helper/math'
], function (UNITS, $timeHelper, $math) {
    let errorCallback = function () {}
    let successCallback = function () {}

    let i18n = $filter('i18n')
    let readableMillisecondsFilter = $filter('readableMillisecondsFilter')
    let readableDateFilter = $filter('readableDateFilter')

    let queue = []
    let index = 0

    function joinTroopsLog (units) {
        let troops = []

        for (let unit in units) {
            troops.push(`${unit}: ${units[unit]}`)
        }

        return troops.join(',')
    }

    function joinOfficersLog (officers) {
        let string = []

        for (let officer in officers) {
            string.push(officer)
        }

        return string.join(', ')
    }

    function updateVillageData (command, prop, _callback) {
        let coords = command[prop].coords.split('|').map(function (coord) {
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
        for (let u in units) {
            return true
        }

        return false
    }

    function cleanZeroUnits (units) {
        let cleanUnits = {}

        for (let unit in units) {
            let amount = parseInt(units[unit], 10)

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
        let army = {
            units: units,
            officers: officers
        }

        let travelTime = $armyService.calculateTravelTime(army, {
            barbarian: false,
            ownTribe: false,
            officers: officers,
            effects: false
        })

        origin = origin.split('|')
        target = target.split('|')

        let distance = $math.actualDistance({
            x: origin[0],
            y: origin[1]
        }, {
            x: target[0],
            y: target[1]
        })

        let totalTravelTime = $armyService.getTravelTimeForDistance(
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

        console.log('============= planeador =============')
        console.log('ataque #' + command.id + ' enviado')

        console.log({
            start_village: command.origin.id,
            target_village: command.target.id,
            type: command.type,
            units: command.units,
            icon: 0,
            officers: command.officers,
            catapult_target: null
        })
    }

    function onError (fn) {
        errorCallback = fn
    }

    function onSuccess (fn) {
        successCallback = fn
    }

    // function add (origin, target, units, arrive, type, officers) {
    function add (command) {
        if (!command.origin || !command.target) {
            return errorCallback('Origin/target has errors.')
        }

        if (!checkCoords(command.origin)) {
            return errorCallback(`Origin coords format ${origin} is invalid.`)
        }

        if (!checkCoords(command.target)) {
            return errorCallback(`Origin coords format ${target} is invalid.`)
        }

        if (!checkUnits(command.units)) {
            return errorCallback('You need to specify an amount of units.')
        }

        command.units = cleanZeroUnits(command.units)

        let arriveTime = new Date(command.arrive).getTime()
        let travelTime = getTravelTime(command.origin, command.target, command.units, command.type)
        let sendTime = arriveTime - travelTime

        if (!checkArriveTime(sendTime)) {
            return errorCallback('This command should have already exited.')
        }

        // transform "true" to 1 because the game do like that
        for (let officer in command.officers) {
            command.officers[officer] = 1
        }

        command.id = index++
        command.sendTime = sendTime
        command.travelTime = travelTime
        command.origin = { coords: command.origin, name: null, id: null }
        command.target = { coords: command.target, name: null, id: null }

        let checkVillages = new Promise(function (resolve, reject) {
            let success = 0

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

            successCallback('Command added.')
        })

        checkVillages.catch(function (error) {
            errorCallback(error)
        })
    }

    function show (_id) {
        let gameTime = $timeHelper.gameTime()

        // let commandsTable = {}

        for (let i = 0; i < queue.length; i++) {
            let cmd = queue[i]

            if (_id && _id != cmd.id) {
                continue
            }
            
            let troops = joinTroopsLog(cmd.units)
            let officers = joinOfficersLog(cmd.officers)
            let $travelTime = readableMillisecondsFilter(cmd.travelTime)
            let $sendTime = readableDateFilter(cmd.sendTime)
            let $arrive = readableDateFilter(cmd.sendTime + cmd.travelTime)
            let $remain = readableMillisecondsFilter(cmd.sendTime - gameTime)

            console.log(`%c============= planeador.show #${cmd.id} =============`, 'background:#ccc')
            console.log(`Identificação:  ${cmd.id}`)
            console.log(`Saida em:       ${$remain}`)
            console.log(`Duração:        ${$travelTime}`)
            console.log(`Envio:          ${$sendTime}`)
            console.log(`Chegada:        ${$arrive}`)
            console.log(`Origem:         ${cmd.origin.name} (${cmd.origin.coords})`)
            console.log(`Alvo:           ${cmd.target.name} (${cmd.target.coords})`)
            console.log(`Tropas:         ${troops}`)
            console.log(`Oficiais:       ${officers}`)
            console.log(`Tipo:           ${cmd.type}`)

            // commandsTable[cmd.id] = {
            //     'Saida em': $remain,
            //     'Duração': $travelTime,
            //     'Envio': $sendTime,
            //     'Chegada': $arrive,
            //     'Origem': `${cmd.target.name} (${cmd.target.coords})`,
            //     'Alvo': `${cmd.target.name} (${cmd.target.coords})`,
            //     'Tropas': troops,
            //     'Oficiais': officers,
            //     'Tipo': cmd.type
            // }
        }

        // console.table(commandsTable)
    }

    function remove (id) {
        console.log('%c============= planeador.remove =============', 'background:#ccc')

        for (let i = 0; i < queue.length; i++) {
            if (queue[i].id == id) {
                console.log('ataque #' + id + ' removido!')
                
                queue.splice(i, i + 1)
                return
            }
        }

        console.log('nenhum ataque removido!')
    }

    function listener () {
        setInterval(function () {
            let gameTime = $timeHelper.gameTime()
            let command
            let i

            if (!queue.length) {
                return false
            }

            for (i = 0; i < queue.length; i++) {
                if (queue[i].sendTime - gameTime < 0) {
                    sendCommand(queue[i])
                } else {
                    break
                }
            }

            if (i) {
                queue.splice(0, i)
            }
        }, 150)
    }

    // listener()

    return {
        version: '0.1.0',
        add: add,
        show: show,
        remove: remove,
        onError: onError,
        onSuccess: onSuccess
    }
})
