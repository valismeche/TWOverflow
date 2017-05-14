define('FarmOverflow/Village', [
    'models/CommandListModel',
    'models/CommandModel',
    'conf/village'
], function (
    CommandListModel,
    CommandModel,
    VILLAGE_CONFIG
) {
    // 'READY_STATES' : {
    //     'COMPLETED'         : 'completed',
    //     'EFFECTS'           : 'effects',
    //     'BUILDINGS'         : 'buildings',
    //     'UNITS'             : 'units',
    //     'UNIT_QUEUE'        : 'unit_queue',
    //     'RESOURCES'         : 'resources',
    //     'TRADES'            : 'trades',
    //     'TIMELINE'          : 'timeline',
    //     'BUILDING_QUEUE'    : 'buildingQueue',
    //     'COMMANDS'          : 'commands',
    //     'OWN_COMMANDS'      : 'ownCommands',
    //     'FOREIGN_COMMANDS'  : 'foreignCommands',
    //     'SCOUTING'          : 'scouting',
    //     'SCOUTING_COMMANDS' : 'scoutingCommands'
    // }

    /**
     * @class
     *
     * @param {VillageModel} original - Objeto original da aldeia.
     */
    function Village (original) {
        this.original = original
        this.id = original.data.villageId
        this.x = original.data.x
        this.y = original.data.y
        this.name = original.data.name
        this.units = original.unitInfo.units
        this.position = original.getPosition()
    }

    Village.prototype.countCommands = function () {
        let commands = this.original.getCommandListModel()

        var outgoing = commands.getOutgoingCommands(true).length
        var incoming = commands.getIncomingCommands(true).length

        return outgoing + incoming
    }

    Village.prototype.updateCommands = function (callback) {
        $socket.emit($route.GET_OWN_COMMANDS, {
            village_id: this.id
        }, (data) => {
            let commandList = new CommandListModel([], this.id)

            for (let i = 0; i < data.commands.length; i++) {
                let command = new CommandModel(data.commands[i])

                commandList.add(command)
            }

            this.original.setCommandListModel(commandList)

            callback()
        })
    }

    Village.prototype.commandsLoaded = function () {
        return this.original.isReady(VILLAGE_CONFIG.OWN_COMMANDS)
    }

    Village.prototype.unitsLoaded = function () {
        return this.original.isReady(VILLAGE_CONFIG.UNITS)
    }

    Village.prototype.loaded = function () {
        if (!this.original.isInitialized()) {
            $villageService.initializeVillage(this.original)
        }

        return this.commandsLoaded() && this.unitsLoaded()
    }

    Village.prototype.load = function (callback) {
        if (this.loaded()) {
            return callback()
        }

        let queue = 0
        let loaded = 0

        if (!this.commandsLoaded()) {
            queue++

            $socket.emit($route.GET_OWN_COMMANDS, {
                village_id: this.id
            }, function () {
                if (++loaded === queue) {
                    callback()
                }
            })
        }

        if (!this.unitsLoaded()) {
            queue++

            $socket.emit($route.VILLAGE_UNIT_INFO, {
                village_id: this.id
            }, function () {
                if (++loaded === queue) {
                    callback()
                }
            })
        }
    }

    return Village
})
