define('TWOverflow/Queue/analytics', [
    'TWOverflow/Queue'
], function (Queue) {
    Queue.analytics = function () {
        ga('create', '___queueAnalytics', 'auto', 'FarmOverflowQueue')

        Queue.bind('start', function () {
            ga('FarmOverflowQueue.send', 'event', 'behavior', 'start')
        })

        Queue.bind('stop', function () {
            ga('FarmOverflowQueue.send', 'event', 'behavior', 'stop')
        })

        Queue.bind('error', function (error) {
            ga('FarmOverflowQueue.send', 'event', 'commands', 'error', error)
        })

        Queue.bind('send', function (command) {
            ga('FarmOverflowQueue.send', 'event', 'commands', 'send', command.type)
        })

        Queue.bind('add', function () {
            ga('FarmOverflowQueue.send', 'event', 'behavior', 'add')
        })

        Queue.bind('expired', function () {
            ga('FarmOverflowQueue.send', 'event', 'commands', 'expired')
        })

        Queue.bind('remove', function (removed, command, manualRemove) {
            if (removed && manualRemove) {
                ga('FarmOverflowQueue.send', 'event', 'commands', 'remove')
            }
        })
    }
})
