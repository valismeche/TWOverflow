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
        var readableDateFilter = $filter('readableDateFilter')
        var unitNames = $model.getGameData().getOrderedUnitNames()
        var officerNames = $model.getGameData().getOrderedOfficerNames()

        function genUnitsInput () {
            var wrapper = ['<tr>']

            unitNames.forEach(function (unit, index) {
                if (index % 2 === 0 && index !== 0) {
                    wrapper.push('</tr><tr>')
                }

                var name = $filter('i18n')(unit, $root.loc.ale, 'unit_names')

                wrapper.push(
                    '<td class="cell-space-left">',
                    '<span class="float-left icon-bg-black icon-44x44-unit-' + unit + '"></span>',
                    '<div class="ff-cell-fix cell-space-44x44">',
                    '<span class="ng-binding">' + name + '</span>',
                    '<input class="unit" type="number" name="' + unit + '" placeholder="0">',
                    '</div>',
                    '</td>'
                )
            })

            wrapper.push('</tr>')

            return wrapper.join('')
        }

        function genOfficersInput () {
            var wrapper = ['<tr>']
            
            officerNames.forEach(function (officer, index) {
                var name = $filter('i18n')(officer, $root.loc.ale, 'officer_names')

                wrapper.push(
                    '<td>',
                    '<span class="icon-44x44-premium_officer_' + officer + '"></span>',
                    '<label class="size-34x34 btn-orange icon-26x26-checkbox">',
                    '<input type="checkbox" name="' + officer + '">',
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
            var hour = zeroPad(date.getHours())
            var min = zeroPad(date.getMinutes())
            var sec = zeroPad(date.getSeconds())
            var day = zeroPad(date.getDate())
            var month = zeroPad(date.getMonth() + 1)
            var year = date.getFullYear()

            return hour + ':' + min + ':' + sec + ' ' + month + '/' + day + '/' + year
        }

        function bindAdd () {
            var commandType = 'attack'

            $addForm.on('submit', function (event) {
                event.preventDefault()

                if (!$addForm[0].checkValidity()) {
                    return false
                }

                var command = {
                    units: {},
                    officers: {},
                    type: commandType
                }

                inputsMap.forEach(function (name) {
                    var $input = $addForm.find('[name="' + name + '"]')
                    var value = $input.val()

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

            $addAttack.on('click', function (event) {
                commandType = 'attack'
                $addForm.find('input:submit')[0].click()
            })

            $addSupport.on('click', function (event) {
                commandType = 'support'
                $addForm.find('input:submit')[0].click()
            })

            $addSelected.on('click', function () {
                var pos = $model.getSelectedVillage().getPosition()
                $origin.val(pos.x + '|' + pos.y)
            })

            $addCurrentDate.on('click', function () {
                var now = dateToString($timeHelper.gameDate())
                $arrive.val(now)
            })
        }

        var queueInterface = new Interface('farmOverflow-queue', {
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

        var queueButton = new FrontButton({
            label: 'Queue'
        })

        var $window = $(queueInterface.$window)

        var $addForm = $window.find('form.addForm')
        var $addAttack = $window.find('a.attack')
        var $addSupport = $window.find('a.support')
        var $switch = $window.find('a.switch')
        var $addSelected = $window.find('a.addSelected')
        var $addCurrentDate = $window.find('a.addCurrentDate')
        var $origin = $window.find('input.origin')
        var $arrive = $window.find('input.arrive')
        var $officers = $window.find('table.officers input')
        var $queue = $window.find('div.queue')

        var inputsMap = ['origin', 'target', 'arrive']
            .concat($model.getGameData().getOrderedUnitNames())
            .concat($model.getGameData().getOrderedOfficerNames())

        bindAdd()

        queueButton.click(function () {
            queueInterface.openWindow()
        })

        Queue.onSuccess(function (msg) {
            emitNotif('success', msg)
        })

        Queue.onError(function (error) {
            emitNotif('error', error)
        })

        Queue.onAdd(function (command) {
            var $command = document.createElement('div')
            $command.className = 'command'

            var originLabel = command.origin.name + ' (' + command.origin.coords + ')'
            var origin = createButtonLink('village', originLabel, command.origin.id)

            var targetLabel = command.target.name + ' (' + command.target.coords + ')'
            var target = createButtonLink('village', targetLabel, command.target.id)

            var typeClass = command.type === 'attack' ? 'attack-small' : 'support'
            var arrive = readableDateFilter(command.sendTime + command.travelTime)
            var sendTime = readableDateFilter(command.sendTime)

            $command.innerHTML = TemplateEngine('___htmlQueueCommand', {
                sendTime: sendTime,
                origin: origin.html,
                target: target.html,
                typeClass: typeClass,
                arrive: arrive,
                units: command.units,
                officers: command.officers,
                lang: {
                    out: 'Saída',
                    timeLeft: 'Tempo restante',
                    village: 'Aldeia',
                    arrive: 'Chegada',
                    units: 'Tropas',
                    officers: 'Oficiais'
                }
            })

            $queue.append($command)
        })
    }
})
