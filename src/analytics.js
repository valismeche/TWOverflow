Analytics = (function () {
    let player = null
    let uid = null

    let setPlayer = function (_player) {
        if (!player) {
            player = _player
        }
    }

    let setUid = function (_uid) {
        if (!uid) {
            uid = _uid
        }
    }

    let init = function (_player) {
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

    let attack = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'attack')
    }

    let attackError = function (error) {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'attackError', error)
    }

    let ignoreTarget = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'ignoreTarget')
    }

    let priorityTarget = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'commands', 'priorityTarget')
    }

    let start = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'start')
    }

    let pause = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'pause')
    }

    let settingsChange = function (settings) {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'settingsChange', settings)
    }

    let villageChange = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'villageChange')
    }

    let remoteCommand = function () {
        if (!player) {
            return false
        }

        ga('FarmOverflow.send', 'event', 'behavior', 'remoteCommand')
    }

    return {
        init: init,
        attack: attack,
        attackError: attackError,
        ignoreTarget,
        priorityTarget,
        start: start,
        pause: pause,
        settingsChange: settingsChange,
        villageChange: villageChange,
        remoteCommand: remoteCommand
    }
})()
