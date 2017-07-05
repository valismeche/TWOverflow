require([
    'TWOverflow/ready',
    'TWOverflow/Farm',
    'TWOverflow/Farm/interface',
    'TWOverflow/Farm/analytics'
], function (
    ready,
    Farm
) {
    if (Farm.isInitialized()) {
        return false
    }

    ready(function () {
        Farm.init()
        Farm.interface()
        Farm.analytics()
    })
})
