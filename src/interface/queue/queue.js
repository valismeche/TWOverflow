define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton',
    'helper/time'
], function (Interface, FrontButton, $timeHelper) {
    return function (commandQueue) {
        let unitNames = $model.getGameData().getOrderedUnitNames()
        let officerNames = $model.getGameData().getOrderedOfficerNames()

        function genUnitsInput () {
            let wrapper = ['<tr>']

            unitNames.forEach((unit, index) => {
                if (index % 2 === 0 && index !== 0) {
                    wrapper.push('</tr><tr>')
                }

                let name = $filter('i18n')(unit, $root.loc.ale, 'unit_names')

                wrapper.push(
                    '<td class="cell-space-left">',
                    `<span class="float-left icon-bg-black icon-44x44-unit-${unit}"></span>`,
                    '<div class="ff-cell-fix cell-space-44x44">',
                    `<span class="ng-binding">${name}</span>`,
                    `<input class="unit" type="number" name="${unit}" placeholder="0">`,
                    '</div>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
        }

        function genOfficersInput () {
            let wrapper = ['<tr>']
            
            officerNames.forEach((officer, index) => {
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

        function isUnit (value) {
            return unitNames.includes(value)
        }

        function isOfficer (value) {
            return officerNames.includes(value)
        }

        function isEmptyUnits (units) {
            for (let unit in units) {
                if (units[unit] > 0) {
                    return false
                }
            }

            return true
        }

        function zeroPad (number) {
            return number <= 9 ? ('0' + number) : number;
        }

        function dateToString (date) {
            let hour = zeroPad(date.getHours())
            let min = zeroPad(date.getMinutes())
            let sec = zeroPad(date.getSeconds())
            let day = zeroPad(date.getDate())
            let month = zeroPad(date.getMonth())
            let year = date.getFullYear()

            return `${hour}:${min}:${sec} ${month}/${day}/${year}`
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

        let $w = $(queueInterface.$window)
        let $addForm = $w.find('form.addForm')
        let $addAttack = $w.find('a.attack')
        let $addSupport = $w.find('a.support')
        let $switch = $w.find('a.switch')
        let $addSelected = $w.find('a.addSelected')
        let $addCurrentDate = $w.find('a.addCurrentDate')
        let $origin = $w.find('input.origin')
        let $arrive = $w.find('input.arrive')
        let $officers = $w.find('table.officers input')

        console.log($officers)

        let inputsMap = ['origin', 'target', 'arrive']
            .concat($model.getGameData().getOrderedUnitNames())
            .concat($model.getGameData().getOrderedOfficerNames())

        function bindAdd () {
            $addForm.on('submit', (event) => {
                event.preventDefault()

                if (!$addForm[0].checkValidity()) {
                    return false
                }

                let command = {
                    units: {},
                    officers: {}
                }

                inputsMap.forEach((name) => {
                    let $input = $addForm.find(`[name="${name}"]`)
                    let value = $input.val()

                    console.log()

                    if ($input[0].type === 'number') {
                        value = parseInt(value, 10)
                    }

                    if (!value) {
                        return false
                    }

                    if (isUnit(name)) {
                        return command.units[name] = value
                    }

                    if (isOfficer(name)) {
                        return command.officers[name] = value
                    }

                    command[name] = value
                })

                if (isEmptyUnits(command.units)) {
                    return alert('You need to specify some units.')
                }

                console.log('ADD COMMAND:', command)
            })

            $officers.on('click', function () {
                $(this).parent().toggleClass(inputCheckedClass)
            })

            $addAttack.on('click', (event) => {
                $addForm.find('input:submit')[0].click()
            })

            $addSelected.on('click', () => {
                let pos = $model.getSelectedVillage().getPosition()
                $origin.val(pos.x + '|' + pos.y)
                return false
            })

            $addCurrentDate.on('click', () => {
                let now = dateToString($timeHelper.gameDate())
                $arrive.val(now)
                return false
            })
        }

        bindAdd()
    }
})
