define('TWOverflow/Queue/interface', [
    'TWOverflow/Queue',
    'TWOverflow/locale',
    'TWOverflow/Interface',
    'TWOverflow/Interface/buttonLink',
    'TWOverflow/FrontButton',
    'helper/time',
    'ejs'
], function (
    Queue,
    Locale,
    Interface,
    buttonLink,
    FrontButton,
    $timeHelper,
    ejs
) {
    // Controlador de interface
    var ui
    // Controlador do botão para abrir a janela da interface
    var opener
    // Atalhos rapidos para os elementos da janela.
    var $window
    var $switch
    var $addForm
    var $origin
    var $target
    var $arrive
    var $officers
    var $sections

    /**
     * Elementos da previsão dos tempos de viagem de todas unidades.
     * 
     * @type {Object}
     */
    var $unitTravelTimes = {
        attack: {},
        support: {}
    }
    
    /**
     * Dados do jogador
     *
     * @type {Object}
     */
    var $player
    
    /**
     * Dados do jogo.
     * 
     * @type {Object}
     */
    var $gameData = $model.getGameData()
    
    /**
     * Formato das datas usadas nos registros.
     * 
     * @type {String}
     */
    var dateFormat = 'dd/MM/yyyy hh:mm:ss'
    
    /**
     * Armazena se as entradas das coordenadas e data de chegada são validas.
     * 
     * @type {Object}
     */
    var validInput = {
        origin: false,
        target: false,
        arrive: false
    }
    
    /**
     * Nome de todos oficiais.
     * 
     * @type {Array}
     */
    var officerNames = $gameData.getOrderedOfficerNames()
    
    /**
     * Nome de todas unidades.
     * 
     * @type {Array}
     */
    var unitNames = $gameData.getOrderedUnitNames()

    /**
     * Nome de uma unidade de cada velocidade disponivel no jogo.
     * Usados para gerar os tempos de viagem.
     * 
     * @type {Array}
     */
    var unitsBySpeed = [
        'knight',
        'heavy_cavalry',
        'axe',
        'sword',
        'ram',
        'snob',
        'trebuchet'
    ]

    /**
     * Nome de todos inputs usados para adicionar os coamndos na lista de espera.
     * 
     * @type {Array}
     */
    var inputsMap = ['origin', 'target', 'arrive'].concat(unitNames, officerNames)

    /**
     * Tipo de comando que será adicionado a lista de espera,
     * setado quando um dos botões de adição é pressionado.
     * 
     * @type {String}
     */
    var commandType

    /**
     * Aldeia atualmente selecionada no mapa.
     * 
     * @type {Array|Boolean} Coordenadas da aldeia [x, y]
     */
    var mapSelectedVillage = false

    /**
     * Oculpa os tempos de viagem
     */
    var hideTravelTimes = function () {
        $travelTimes.css('display', 'none')
    }

    /**
     * Oculpa os tempos de viagem
     */
    var showTravelTimes = function () {
        $travelTimes.css('display', '')
    }

    var i18nUnit = function (unit) {
        return $filter('i18n')(unit, $root.loc.ale, 'unit_names')
    }

    /**
     * Formata milisegundos em hora/data
     * @return {String} Data e hora formatada
     */
    var formatDate = function (ms) {
        return readableDateFilter(ms, null, null, null, dateFormat)
    }

    /**
     * Analisa as condições para ver se é possível calcular os tempos de viagem.
     * @return {Boolean}
     */
    var availableTravelTimes = function () {
        return ui.isVisible() && ui.activeTab === 'add'
            && validInput.origin && validInput.target && validInput.arrive
    }

    /**
     * Popula as abas "Em espera" e "Registros" com os comandos armazenados.
     */
    var appendStoredCommands = function () {
        Queue.getWaitingCommands().forEach(function (cmd) {
            appendCommand(cmd, 'queue')
        })

        Queue.getSendedCommands().forEach(function (cmd) {
            appendCommand(cmd, 'sended')
        })

        Queue.getExpiredCommands().forEach(function (cmd) {
            appendCommand(cmd, 'expired')
        })
    }

    /**
     * Verifica se o valor passado é uma unidade.
     * @param  {String} - value
     * @return {Boolean}
     */
    var isUnit = function (value) {
        return unitNames.includes(value)
    }

    /**
     * Verifica se o valor passado é um oficial.
     * @param  {String} - value
     * @return {Boolean}
     */
    var isOfficer = function (value) {
        return officerNames.includes(value)
    }

    /**
     * Obtem a data atual do jogo fomatada para hh:mm:ss:SSS dd/MM/yyyy
     * @return {[type]} [description]
     */
    var gameDateFormated = function () {
        var zf = $timeHelper.zerofill
        var date = $timeHelper.gameDate()
        var ms = zf(date.getMilliseconds(), 3)
        var sec = zf(date.getSeconds(), 2)
        var min = zf(date.getMinutes(), 2)
        var hour = zf(date.getHours(), 2)
        var day = zf(date.getDate(), 2)
        var month = zf(date.getMonth() + 1, 2)
        var year = date.getFullYear()

        return hour + ':' + min + ':' + sec + ':' + ms + ' ' + day + '/' + month + '/' + year
    }

    /**
     * Calcula o tempo de viagem para cada unidade com tempo de viagem disti
     * Tanto para ataque quanto para defesa.
     */
    var populateTravelTimes = function () {
        if (!validInput.origin || !validInput.target) {
            return $travelTimes.hide()
        }

        var origin = $origin.val()
        var target = $target.val()
        var officers = getOfficers()
        var travelTime = {}

        if (validInput.arrive) {
            var arrive = fixDate($arrive.val())
            var arriveTime = new Date(arrive).getTime()
        }

        ;['attack', 'support'].forEach(function (type) {
            unitsBySpeed.forEach(function (unit) {
                var units = {}
                units[unit] = 1

                var travelTime = Queue.getTravelTime(origin, targetVillage, units, type, officers)
                var readable = readableMillisecondsFilter(travelTime)

                if (validInput.arrive) {
                    var sendTime = arriveTime - travelTime

                    if (!isValidSendTime(sendTime)) {
                        readable = genRedSpan(readable)
                    }
                } else {
                    readable = genRedSpan(readable)
                }

                $unitTravelTimes[type][unit].innerHTML = readable
            })
        })

        showTravelTimes()
    }

    /**
     * Gera um <span> com classe para texto vermelho.
     */
    var genRedSpan = function (text) {
        return '<span class="text-red">' + text + '</span>'
    }

    /**
     * Altera a cor do texto do input
     * 
     * @param  {jqLite} $elem
     */
    var colorRed = function ($elem) {
        $elem.css('color', '#a1251f')
    }

    /**
     * Restaura a cor do texto do input
     * 
     * @param  {jqLite} $elem
     */
    var colorNeutral = function ($elem) {
        $elem.css('color', '')
    }

    /**
     * Adiciona um comando de acordo com os dados informados.
     * 
     * @param {String} type Tipo de comando (attack, support ou relocate)
     */
    var addCommand = function (type) {
        var command = {
            units: {},
            officers: {},
            type: type
        }

        inputsMap.forEach(function (name) {
            var $input = $addForm.find('[name="' + name + '"]')
            var value = $input.val()

            if ($input[0].className === 'unit') {
                if (isNaN(value) && value !== '*') {
                    return false
                }

                value = isNaN(value) ? value : parseInt(value, 10)
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

        Queue.addCommand(command)
    }

    /**
     * Adiciona um comando na seção.
     * 
     * @param {Object} command - Dados do comando que será adicionado na interface.
     * @param {String} section - Seção em que o comandos erá adicionado.
     */
    var appendCommand = function (command, section) {
        var $command = document.createElement('div')
        $command.id = section + '-' + command.id
        $command.className = 'command'

        var origin = buttonLink('village', villageLabel(command.origin), command.origin.id)
        var target = buttonLink('village', villageLabel(command.target), command.target.id)

        var typeClass = fixCommandTypeClass(command.type)
        var arrive = readableDateFilter(command.sendTime + command.travelTime, null, null, null, dateFormat)
        var sendTime = readableDateFilter(command.sendTime, null, null, null, dateFormat)
        var hasOfficers = !!Object.keys(command.officers).length

        $command.innerHTML = ejs.render('___htmlQueueCommand', {
            sendTime: sendTime,
            typeClass: typeClass,
            arrive: arrive,
            units: command.units,
            hasOfficers: hasOfficers,
            officers: command.officers,
            section: section,
            locale: Locale
        })

        $command.querySelector('.origin').replaceWith(origin.elem)
        $command.querySelector('.target').replaceWith(target.elem)

        if (section === 'queue') {
            var $remove = $command.querySelector('.remove-command')

            $remove.addEventListener('click', function (event) {
                Queue.removeCommand(command, 'removed')
            })
        }

        $sections[section].append($command)
        ui.setTooltips()

        toggleEmptyMessage(section)
    }

    /**
     * Remove um comando da seção especificada.
     * 
     * @param  {Object} command - Comando que será removido.
     * @param  {String} section - Sessão em que o comando se encontra.
     */
    var removeCommand = function (command, section) {
        var $command = document.getElementById(section + '-' + command.id)

        if ($command) {
            $command.remove()
        }

        toggleEmptyMessage(section)
        
        if (ui.isVisible('queue')) {
            ui.recalcScrollbar()
        }
    }

    /**
     * Mostra ou oculpa a mensagem "vazio" de acordo com
     * a quantidade de comandos presetes na seção.
     * 
     * @param  {String} section
     */
    var toggleEmptyMessage = function (section) {
        var $where = $sections[section]
        var $msg = $where.find('p.nothing')

        var condition = section === 'queue'
            ? Queue.getWaitingCommands()
            : $where.find('div')

        $msg.css('display', condition.length === 0 ? '' : 'none')
    }

    /**
     * Configura todos eventos dos elementos da interface.
     */
    var bindEvents = function () {
        $switch.on('click', function (event) {
            if (Queue.isRunning()) {
                Queue.stop()
            } else {
                Queue.start()
            }
        })

        $window.find('.buttons .add').on('click', function () {
            addCommand(this.name)
        })

        $window.find('a.clear').on('click', function () {
            clearRegisters()
        })

        $window.find('a.addSelected').on('click', function () {
            var coords = $model.getSelectedVillage().getPosition()

            $origin.val(coords.x + '|' + coords.y)
            $origin.trigger('input')
        })

        $window.find('a.addMapSelected').on('click', function () {
            if (!mapSelectedVillage) {
                return emitNotif('error', Locale('queue', 'error.noMapSelectedVillage'))
            }

            $target.val(mapSelectedVillage.join('|'))
            $target.trigger('input')
        })

        $window.find('a.addCurrentDate').on('click', function () {
            $arrive.val(gameDateFormated())
            $arrive.trigger('input')
        })

        $origin.on('input', function () {
            validInput.origin = isValidCoords($origin.val())

            populateTravelTimes()

            if (!validInput.origin) {
                return colorRed($origin)
            }

            Queue.getVillageByCoords($origin.val(), function (data) {
                if (!data || data.id < 0) {
                    validInput.origin = false

                    hideTravelTimes()
                    colorRed($origin)
                } else {
                    colorNeutral($origin)
                }

            })
        })

        $target.on('input', function () {
            validInput.target = isValidCoords($target.val())

            if (!validInput.target) {
                return colorRed($target)
            }

            Queue.getVillageByCoords($target.val(), function (data) {
                if (!data || data.id < 0) {
                    validInput.target = false

                    colorRed($target)
                    hideTravelTimes()
                } else {
                    targetVillage = data

                    colorNeutral($target)
                    populateTravelTimes()
                }
            })
        })

        $arrive.on('input', function () {
            validInput.arrive = isValidDateTime($arrive.val())

            if (validInput.arrive) {
                colorNeutral($arrive)
            } else {
                colorRed($arrive)
            }

            populateTravelTimes()
        })

        $officers.on('change', function () {
            populateTravelTimes()
        })

        $root.$on($eventType.SHOW_CONTEXT_MENU, function (event, menu) {
            mapSelectedVillage = [menu.data.x, menu.data.y]
        })

        $root.$on($eventType.DESTROY_CONTEXT_MENU, function () {
            mapSelectedVillage = false
        })
    }

    /**
     * Remove todos os registros da interface e do localStorage.
     */
    var clearRegisters = function () {
        Queue.getSendedCommands().forEach(function (cmd) {
            removeCommand(cmd, 'sended')
        })

        Queue.getExpiredCommands().forEach(function (cmd) {
            removeCommand(cmd, 'expired')
        })

        Queue.clearRegisters()
    }

    /**
     * Gera um texto de notificação com as traduções.
     * 
     * @param  {String} key
     * @param  {String} key2
     * @param  {String=} prefix
     * @return {String}
     */
    var genNotifText = function (key, key2, prefix) {
        if (prefix) {
            key = prefix + '.' + key
        }

        return Locale('queue', key) + ' ' + Locale('queue', key2)
    }

    /**
     * Verifica se o tempo de envio é menor que o tempo atual do jogo.
     * 
     * @param  {Number}  time
     * @return {Boolean}
     */
    var isValidSendTime = function (time) {
        if ($timeHelper.gameTime() > time) {
            return false
        }

        return true
    }

    /**
     * Obtem todos oficiais ativados no formulário para adicioanr comandos.
     * 
     * @return {Object} Oficiais ativos
     */
    var getOfficers = function () {
        var officers = {}

        officerNames.forEach(function (officer) {
            var $input = $addForm.find('[name="' + officer + '"]')

            if ($input.val()) {
                officers[officer] = true
            }
        })

        return officers
    }

    /**
     * Corrige o nome da classe do icone de acordo com o tipo do comando.
     * 
     * @param  {String} type - Tipo do comando
     * @return {String} Classe modificada
     */
    var fixCommandTypeClass = function (type) {
        if (type === 'attack') {
            type += '-small'
        }

        return type
    }

    function QueueInterface () {
        $player = $model.getSelectedCharacter()

        // Valores a serem substituidos no template da janela
        var replaces = {
            version: Queue.version,
            locale: Locale,
            i18nUnit: i18nUnit,
            units: unitNames,
            officers: officerNames
        }

        ui = new Interface('CommandQueue', {
            activeTab: 'info',
            template: '___htmlQueueWindow',
            replaces: replaces,
            css: '___cssQueue'
        })

        opener = new FrontButton('Queue')

        // Injeta a data do próximo comando a ser enviado pelo CommandQueue
        // no botão para um rápida visualização.
        opener.hover(function () {
            var commands = Queue.getWaitingCommands()
            var sendTime = commands.length ? formatDate(sendTime) : Locale('queue', 'general.none')
            var text = Locale('queue', 'general.nextCommand') + ': ' + sendTime

            opener.updateQuickview(text)
        })

        opener.click(function () {
            ui.openWindow()
        })

        // Armazena os elementos da janela para rápido acesso.
        $window = $(ui.$window)
        $switch = $window.find('a.switch')
        $addForm = $window.find('form.addForm')
        $origin = $window.find('input.origin')
        $target = $window.find('input.target')
        $arrive = $window.find('input.arrive')
        $officers = $window.find('.officers input')
        $travelTimes = $window.find('table.travelTimes')
        $sections = {
            queue: $window.find('div.queue'),
            sended: $window.find('div.sended'),
            expired: $window.find('div.expired')
        }

        // Popula com os elementos de tempo de viagem
        ;['attack', 'support'].forEach(function (type) {
            $travelTimes.find('.' + type).forEach(function ($elem) {
                var unit = $elem.getAttribute('unit')

                $unitTravelTimes[type][unit] = $elem
            })
        })

        Queue.bind('error', function (error) {
            emitNotif('error', error)
        })

        // Remove o comando da lista de espera
        Queue.bind('remove', function (removed, command) {
            if (!removed) {
                return emitNotif('error', Locale('queue', 'error.removeError'))
            }

            removeCommand(command, 'queue')
            emitNotif('success', genNotifText(command.type, 'removed', 'general'))
        })

        // Remove o comando da lista de espera,
        // inclui na lista de ignorados.
        Queue.bind('expired', function (command) {
            removeCommand(command, 'queue')
            appendCommand(command, 'expired')
            emitNotif('error', genNotifText(command.type, 'expired', 'general'))
        })

        // Adiciona o comando da lista de espera.
        Queue.bind('add', function (command) {
            appendCommand(command, 'queue')
            emitNotif('success', genNotifText(command.type, 'added', 'general'))
        })

        // Remove o comando da lista de espera,
        // inclui na lista de enviados.
        Queue.bind('send', function (command) {
            removeCommand(command, 'queue')
            appendCommand(command, 'sended')
            emitNotif('success', genNotifText(command.type, 'sended', 'general'))
        })

        Queue.bind('start', function () {
            opener.$elem.removeClass('btn-green').addClass('btn-red')
            $switch.removeClass('btn-green').addClass('btn-red')
            $switch.html(Locale('queue', 'general.deactivate'))

            emitNotif('success', genNotifText('title', 'activated'))
        })

        Queue.bind('stop', function () {
            opener.$elem.removeClass('btn-red').addClass('btn-green')
            $switch.removeClass('btn-red').addClass('btn-green')
            $switch.html(Locale('queue', 'general.activate'))

            emitNotif('success', genNotifText('title', 'deactivated'))
        })

        setInterval(function () {
            if (availableTravelTimes()) {
                populateTravelTimes()
            }
        }, 1000)

        bindEvents()
        appendStoredCommands()
    }

    return QueueInterface
})
