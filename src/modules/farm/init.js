require([
    'FarmOverflow/ready',
    'FarmOverflow/Farm',
    'FarmOverflow/Farm/interface',
    'FarmOverflow/Farm/analytics'
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
