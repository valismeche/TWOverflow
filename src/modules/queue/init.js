require([
    'FarmOverflow/ready',
    'FarmOverflow/Queue',
    'FarmOverflow/QueueInterface',
    'FarmOverflow/Queue/analytics'
], function (
    ready,
    Queue,
    QueueInterface,
    QueueAnalytics
) {
    if (Queue.initialized) {
        return false
    }

    ready(function () {
        Queue.init()
        QueueInterface()
        QueueAnalytics('___queueAnalytics')
    })
})
