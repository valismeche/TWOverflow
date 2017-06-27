require([
    'FarmOverflow/ready',
    'FarmOverflow/Farm',
    'FarmOverflow/FarmInterface',
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
