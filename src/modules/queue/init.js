require([
    'TWOverflow/ready',
    'TWOverflow/Queue',
    'TWOverflow/Queue/interface',
    'TWOverflow/Queue/analytics'
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
        QueueAnalytics()
    })
})
