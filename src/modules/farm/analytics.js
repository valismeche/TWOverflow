define('FarmOverflow/Farm/analytics', function () {
    return function (farmOverflow, trackId) {
        ga('create', trackId, 'auto', 'FarmOverflowFarm')

        farmOverflow.on('start', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'start')
        })

        farmOverflow.on('pause', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'pause')
        })

        farmOverflow.on('sendCommandError', function (error) {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'attackError', error)
        })

        farmOverflow.on('ignoredVillage', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'ignoreTarget')
        })
        
        farmOverflow.on('priorityTargetAdded', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'priorityTarget')
        })

        farmOverflow.on('settingsChange', function (settings) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'settingsChange', settings)
        })

        farmOverflow.on('remoteCommand', function (code) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'remoteCommand', code)
        })

        farmOverflow.on('nextVillage', function (village) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'villageChange', village.id)
        })

        farmOverflow.on('sendCommand', function () {
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