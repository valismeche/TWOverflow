define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton'
], function (Interface, FrontButton) {
    return function (commandQueue) {
        function genUnitsInput () {
            let html = []

            html.push('<tr>')

            $model.getGameData().getOrderedUnitNames().forEach((unit, index) => {
                if (index % 2 === 0 && index !== 0) {
                    html.push('</tr><tr>')
                }

                let unitLabel = $filter('i18n')(unit, $root.loc.ale, 'unit_names')

                html.push('<td class="cell-space-left">')
                html.push(`<span class="float-left icon-bg-black icon-44x44-unit-${unit}"></span>`)
                html.push('<div class="ff-cell-fix cell-space-44x44">')
                html.push(`<span class="ng-binding">${unitLabel}</span><input class="unit" type="text" maxlength="5">`)
                html.push('</div>')
                html.push('</td>')
            })

            html.push('</tr>')

            return html.join('')
        }

        let queueButton = new FrontButton({
            label: 'Queue'
        })

        let queueInterface = new Interface('farmOverflow-queue', {
            activeTab: 'add',
            htmlTemplate: '___htmlQueueWindow',
            htmlReplaces: {
                version: commandQueue.version,
                author: ___author,
                title: 'CommandQueue',
                unitsInput: genUnitsInput()
            }
        })

        queueButton.click(() => {
            queueInterface.openWindow()
        })
    }
})
