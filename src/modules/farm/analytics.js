define('FarmOverflow/Farm/analytics', function () {
    return function (farmOverflow, trackId) {
        ga('create', trackId, 'auto', 'FarmOverflowFarm')

        farmOverflow.bind('start', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'start')
        })

        farmOverflow.bind('pause', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'pause')
        })

        farmOverflow.bind('sendCommandError', function (error) {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'attackError', error)
        })

        farmOverflow.bind('ignoredVillage', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'ignoreTarget')
        })
        
        farmOverflow.bind('priorityTargetAdded', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'priorityTarget')
        })

        farmOverflow.bind('settingsChange', function (settings) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'settingsChange', settings)
        })

        farmOverflow.bind('remoteCommand', function (code) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'remoteCommand', code)
        })

        farmOverflow.bind('nextVillage', function (village) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'villageChange', village.id)
        })

        farmOverflow.bind('sendCommand', function () {
            var player = injector.get('modelDataService').getPlayer()
            var character = player.getSelectedCharacter()
            var data = []

            data.push(character.getName())
            data.push(character.getId())
            data.push(character.getWorldId())

            ga('FarmOverflowFarm.send', 'event', 'commands', 'attack', data.join('~'))
        })
    }
})