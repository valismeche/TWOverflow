/**
 * Gera um número aleatório aproximado da base.
 *
 * @param {Number} base - Número base para o calculo.
 */
function randomSeconds (base) {
    base = parseInt(base, 10)
    
    var max = base + (base / 2)
    var min = base - (base / 2)

    return Math.round(Math.random() * (max - min) + min)
}

/**
 * Converte uma string com um tempo em segundos.
 *
 * @param {String} time - Tempo que será convertido (hh:mm:ss)
 */
function time2seconds (time) {
    time = time.split(':')
    time[0] = parseInt(time[0], 10) * 60 * 60
    time[1] = parseInt(time[1], 10) * 60
    time[2] = parseInt(time[2], 10)

    return time.reduce(function (a, b) {
        return a + b
    })
}

/**
 * Emite notificação nativa do jogo.
 *
 * @param {String} type - success || error
 * @param {String} message - Texto a ser exibido
 */
function emitNotif (type, message) {
    var eventType = type === 'success'
        ? $eventType.MESSAGE_SUCCESS
        : $eventType.MESSAGE_ERROR

    $root.$broadcast(eventType, {
        message: message
    })
}

function villageLabel (village) {
    return village.name + ' (' + village.x + '|' + village.y + ')'
}

function isValidCoords (xy) {
    return /\s*\d{2,3}\|\d{2,3}\s*/.test(xy)
}

/**
 * Validação de horario e data de envio. Exmplo: 23:59:00:999 30/12/2016
 * 
 * @param  {String}  dateTime
 * @return {Boolean}
 */
function isValidDateTime (dateTime) {
    return /^\s*([01][0-9]|2[0-3]):[0-5]\d:[0-5]\d(:\d{1,3})? (0[1-9]|[12][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}\s*$/.test(dateTime)
}

/**
 * Inverte a posição do dia com o mês.
 */
function fixDate (dateTime) {
    var dateAndTime = dateTime.split(' ')
    var time = dateAndTime[0]
    var date = dateAndTime[1].split('/')

    return time + ' ' + date[1] + '/' + date[0] + '/' + date[2]
}

/**
 * Gera um id unico
 * 
 * @return {[type]}
 */
function guid () {
    return Math.floor((Math.random()) * 0x1000000).toString(16)
}

function matchesElem (elem, selector) {
    if ($(elem).parents(selector).length) {
        return true
    }

    return false
}

/**
 * Obtem o timestamp de uma data em string.
 * Formato da data: mês/dia/ano
 * Exmplo de entrada: 23:59:59:999 12/30/2017
 *
 * @param  {String} dateString - Data em formato de string.
 * @return {Number} Timestamp (milisegundos)
 */
function getTimeFromString (dateString) {
    var dateSplit = dateString.trim().split(' ')
    var time = dateSplit[0].split(':')
    var date = dateSplit[1].split('/')

    var hour = time[0]
    var min = time[1]
    var sec = time[2]
    var ms = time[3] || null

    var month = parseInt(date[0], 10) - 1
    var day = date[1]
    var year = date[2]

    return new Date(year, month, day, hour, min, sec, ms).getTime()
}
