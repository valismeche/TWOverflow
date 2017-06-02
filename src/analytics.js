define('FarmOverflow/analytics', function () {
    var player = null
    var uid = null

    var setPlayer = function (_player) {
        if (!player) {
            player = _player
        }
    }

    var setUid = function (_uid) {
        if (!uid) {
            uid = _uid
        }
    }

    var init = function (_player) {
        setPlayer(_player)
        setUid(player.getWorldId() + '-' + player.getId())

        ga('create', '___analytics', 'auto', 'FarmOverflow')

        // User Scope
        ga('FarmOverflow.set', 'userId', uid)
        ga('FarmOverflow.set', 'dimension1', player.getWorldId())
        ga('FarmOverflow.set', 'dimension2', player.getId())

        // Session Scope
        ga('FarmOverflow.set', 'dimension3', player.getRank())
        ga('FarmOverflow.set', 'dimension4', player.getVillageList().length)
        ga('FarmOverflow.set', 'dimension5', player.getPoints())

        ga('FarmOverflow.send', 'pageview')
    }

    var attack = function () {
        if (!player) {
            return false
        }
        
        ga('FarmOverflow.send', 'event', 'commands', 'attack')
    }

    var attackError = function (error) {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'attackError', error)
    }

    var ignoreTarget = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'ignoreTarget')
    }

    var priorityTarget = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'priorityTarget')
    }

    var start = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'start')
    }

    var pause = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'pause')
    }

    var settingsChange = function (settings) {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'settingsChange', settings)
    }

    var villageChange = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'villageChange')
    }

    var remoteCommand = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'remoteCommand')
    }

    return {
        init: init,
        attack: attack,
        attackError: attackError,
        ignoreTarget: ignoreTarget,
        priorityTarget: priorityTarget,
        start: start,
        pause: pause,
        settingsChange: settingsChange,
        villageChange: villageChange,
        remoteCommand: remoteCommand
    }
})
