define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton'
], function (Interface, FrontButton) {
    return function (commandQueue) {
        function genUnitsInput () {
            let wrapper = ['<tr>']
            let units = $model.getGameData().getOrderedUnitNames()

            units.forEach((unit, index) => {
                if (index % 2 === 0 && index !== 0) {
                    wrapper.push('</tr><tr>')
                }

                let name = $filter('i18n')(unit, $root.loc.ale, 'unit_names')

                wrapper.push(
                    '<td class="cell-space-left">',
                    `<span class="float-left icon-bg-black icon-44x44-unit-${unit}"></span>`,
                    '<div class="ff-cell-fix cell-space-44x44">',
                    `<span class="ng-binding">${name}</span><input class="unit" type="number" placeholder="0">`,
                    '</div>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
        }

        function genOfficersInput () {
            let wrapper = ['<tr>']
            let officers = $model.getGameData().getOrderedOfficerNames()

            officers.forEach((officer, index) => {
                let name = $filter('i18n')(officer, $root.loc.ale, 'officer_names')

                wrapper.push(
                    '<td>',
                    `<span class="icon-44x44-premium_officer_${officer}"></span>`,
                    '<label class="size-34x34 btn-orange icon-26x26-checkbox">',
                    `<input type="checkbox" name="${officer}">`,
                    '</label>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
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
                unitsInput: genUnitsInput(),
                officersInput: genOfficersInput()
            }
        })

        queueButton.click(() => {
            queueInterface.openWindow()
        })
    }
})
