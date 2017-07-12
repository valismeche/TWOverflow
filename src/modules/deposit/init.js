require([
    'TWOverflow/ready',
    'TWOverflow/autoDeposit',
    'TWOverflow/autoDeposit/interface'
], function (
    ready,
    autoDeposit
) {
    if (autoDeposit.isInitialized()) {
        return false
    }

    ready(function () {
        autoDeposit.init()
        autoDeposit.interface()
    })
})
