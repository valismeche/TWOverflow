define('TWOverflow/Farm/analytics', [
    'TWOverflow/Farm',
    'Lockr'
], function (Farm, Lockr) {
    return function (trackId) {
        ga('create', trackId, 'auto', 'TWOverflowFarm')

        Farm.bind('start', function () {
            ga('TWOverflowFarm.send', 'event', 'behavior', 'start')
        })

        Farm.bind('pause', function () {
            ga('TWOverflowFarm.send', 'event', 'behavior', 'pause')
        })

        Farm.bind('sendCommandError', function (error) {
            ga('TWOverflowFarm.send', 'event', 'commands', 'attackError', error)
        })

        Farm.bind('ignoredVillage', function () {
            ga('TWOverflowFarm.send', 'event', 'commands', 'ignoreTarget')
        })
        
        Farm.bind('priorityTargetAdded', function () {
            ga('TWOverflowFarm.send', 'event', 'commands', 'priorityTarget')
        })

        Farm.bind('settingsChange', function (modify) {
            ga('TWOverflowFarm.send', 'event', 'behavior', 'settingsChange', Lockr.get('farm-settings'))
        })

        Farm.bind('remoteCommand', function (code) {
            ga('TWOverflowFarm.send', 'event', 'behavior', 'remoteCommand', code)
        })

        Farm.bind('nextVillage', function (village) {
            ga('TWOverflowFarm.send', 'event', 'behavior', 'villageChange', village.id)
        })

        Farm.bind('sendCommand', function () {
            var player = $model.getPlayer()
            var character = player.getSelectedCharacter()
            var data = []

            data.push(character.getName())
            data.push(character.getId())
            data.push(character.getWorldId())

            ga('TWOverflowFarm.send', 'event', 'commands', 'attack', data.join('~'))
        })
    }
})
