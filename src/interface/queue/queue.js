define('FarmOverflow/QueueInterface', [
    'FarmOverflow/Queue',
    'FarmOverflow/Interface',
    'FarmOverflow/FrontButton',
    'helper/time'
], function (
    Queue,
    Interface,
    FrontButton,
    $timeHelper
) {
    return function () {
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

        function zeroPad (number) {
            return number <= 9 ? ('0' + number) : number;
        }

        function dateToString (date) {
            let hour = zeroPad(date.getHours())
            let min = zeroPad(date.getMinutes())
            let sec = zeroPad(date.getSeconds())
            let day = zeroPad(date.getDate())
            let month = zeroPad(date.getMonth() + 1)
            let year = date.getFullYear()

            return `${hour}:${min}:${sec} ${month}/${day}/${year}`
        }

        function bindAdd () {
            let commandType = 'attack'

            $addForm.on('submit', (event) => {
                event.preventDefault()

                if (!$addForm[0].checkValidity()) {
                    return false
                }

                let command = {
                    units: {},
                    officers: {},
                    type: commandType
                }

                inputsMap.forEach((name) => {
                    let $input = $addForm.find(`[name="${name}"]`)
                    let value = $input.val()

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

                console.log('command', command)

                Queue.add(command)
            })

            $officers.on('click', function () {
                $(this).parent().toggleClass(inputCheckedClass)
            })

            $addAttack.on('click', (event) => {
                commandType = 'attack'
                $addForm.find('input:submit')[0].click()
            })

            $addSupport.on('click', (event) => {
                commandType = 'support'
                $addForm.find('input:submit')[0].click()
            })

            $addSelected.on('click', () => {
                let pos = $model.getSelectedVillage().getPosition()
                $origin.val(pos.x + '|' + pos.y)
            })

            $addCurrentDate.on('click', () => {
                let now = dateToString($timeHelper.gameDate())
                $arrive.val(now)
            })
        }

        let queueInterface = new Interface('farmOverflow-queue', {
            activeTab: 'add',
            htmlTemplate: '___htmlQueueWindow',
            htmlReplaces: {
                version: Queue.version,
                author: ___author,
                title: 'CommandQueue',
                unitsInput: genUnitsInput(),
                officersInput: genOfficersInput()
            }
        })

        let queueButton = new FrontButton({
            label: 'Queue'
        })

        let $window = $(queueInterface.$window)

        let $addForm = $window.find('form.addForm')
        let $addAttack = $window.find('a.attack')
        let $addSupport = $window.find('a.support')
        let $switch = $window.find('a.switch')
        let $addSelected = $window.find('a.addSelected')
        let $addCurrentDate = $window.find('a.addCurrentDate')
        let $origin = $window.find('input.origin')
        let $arrive = $window.find('input.arrive')
        let $officers = $window.find('table.officers input')

        let inputsMap = ['origin', 'target', 'arrive']
            .concat($model.getGameData().getOrderedUnitNames())
            .concat($model.getGameData().getOrderedOfficerNames())

        bindAdd()

        queueButton.click(() => {
            queueInterface.openWindow()
        })

        Queue.onSuccess(function (msg) {
            emitNotif('success', msg)
        })

        Queue.onError(function (error) {
            emitNotif('error', error)
        })
    }
})
