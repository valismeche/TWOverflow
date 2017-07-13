define('TWOverflow/autoDeposit/interface', [
    'TWOverflow/autoDeposit',
    'TWOverflow/FrontButton'
], function (
    autoDeposit,
    FrontButton
) {
    var opener

    function DepositInterface () {
        opener = new FrontButton('Deposit', {
            classHover: false,
            classBlur: false,
            // TODO
            // Adicionar Locale() quando uma tela de configuração global para
            // o TWOverflow for criada.
            tooltip: 'Automatic Resource Deposit collector.'
        })

        opener.click(function () {
            if (autoDeposit.isRunning()) {
                autoDeposit.stop()
                autoDeposit.secondVillage.stop()
                opener.$elem.removeClass('btn-red').addClass('btn-green')

                emitNotif('success', 'Deposit stopped!')
            } else {
                autoDeposit.start()
                autoDeposit.secondVillage.start()
                opener.$elem.removeClass('btn-green').addClass('btn-red')

                emitNotif('success', 'Deposit started!')
            }
        })
    }

    autoDeposit.interface = DepositInterface
})
