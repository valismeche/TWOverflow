define('FarmOverflow/Farm/analytics', [
    'FarmOverflow/Farm',
    'Lockr'
], function (Farm, Lockr) {
    return function (trackId) {
        ga('create', trackId, 'auto', 'FarmOverflowFarm')

        Farm.bind('start', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'start')
        })

        Farm.bind('pause', function () {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'pause')
        })

        Farm.bind('sendCommandError', function (error) {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'attackError', error)
        })

        Farm.bind('ignoredVillage', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'ignoreTarget')
        })
        
        Farm.bind('priorityTargetAdded', function () {
            ga('FarmOverflowFarm.send', 'event', 'commands', 'priorityTarget')
        })

        Farm.bind('settingsChange', function (modify) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'settingsChange', Lockr.get('farm-settings'))
        })

        Farm.bind('remoteCommand', function (code) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'remoteCommand', code)
        })

        Farm.bind('nextVillage', function (village) {
            ga('FarmOverflowFarm.send', 'event', 'behavior', 'villageChange', village.id)
        })

        Farm.bind('sendCommand', function () {
            var player = $model.getPlayer()
            var character = player.getSelectedCharacter()
            var data = []

            data.push(character.getName())
            data.push(character.getId())
            data.push(character.getWorldId())

            ga('FarmOverflowFarm.send', 'event', 'commands', 'attack', data.join('~'))
        })
    }
})
