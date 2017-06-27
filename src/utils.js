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
