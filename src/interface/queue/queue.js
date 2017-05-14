define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton'
], function (Interface, FrontButton) {
    return function (commandQueue) {
        let queueButton = new FrontButton({
            label: 'Queue'
        })

        let queueInterface = new Interface('commandQueue', {
            activeTab: 'add',
            htmlTemplate: '___htmlQueueWindow',
            htmlReplaces: {
                version: commandQueue.version,
                author: ___author,
                title: 'CommandQueue'
            }
        })

        queueButton.click(() => {
            queueInterface.openWindow()
        })
    }
})
