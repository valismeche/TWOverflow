require([
    'TWOverflow/ready',
    'TWOverflow/Farm',
    'TWOverflow/Farm/interface',
    'TWOverflow/Farm/analytics'
], function (
    ready,
    Farm,
    FarmInterface,
    FarmAnalytics
) {
    if (Farm.initialized) {
        return false
    }

    ready(function () {
        Farm.init()
        FarmInterface()
        FarmAnalytics('___farmAnalytics')
    })
})
