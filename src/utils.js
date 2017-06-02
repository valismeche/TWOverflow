/**
 * Remove todas propriedades que tiverem valor zero.
 *
 * @param {Object} units - Unidades do preset a serem filtradas.
 */
function cleanPresetUnits (units) {
    var pure = {}

    for (var unit in units) {
        if (units[unit] > 0) {
            pure[unit] = units[unit]
        }
    }

    return pure
}


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


function sprintf (format, replaces) {
    return format.replace(/{(\d+)}/g, function (match, number) {
        return typeof replaces[number].html !== 'undefined'
            ? replaces[number].html
            : match
    })
}

/**
 * http://krasimirtsonev.com/blog/article/Javascript-template-engine-in-just-20-line
 */
function TemplateEngine (html, options) {
    var re = /{{(.+?)}}/g
    var reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g
    var code = 'with(obj) { var r=[];\n'
    var cursor = 0
    var result
    var match

    var add = function (line, js) {
        if (js) {
            code += line.match(reExp)
                ? line + '\n'
                : 'r.push(' + line + ');\n'
        } else {
            code += line != ''
                ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n'
                : ''
        }
    }

    while(match = re.exec(html)) {
        add(html.slice(cursor, match.index))
        add(match[1], true)

        cursor = match.index + match[0].length
    }

    add(html.substr(cursor, html.length - cursor))

    code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, ' ')

    try {
        result = new Function('obj', code).apply(options, [options])
    } catch (err) {}

    return result
}

/**
 * Cria um botão com icone e link.
 *
 * @param {String} type - Tipo do botão (character||village).
 * @param {String} text - Texto dentro do botão.
 * @param {Number} id - item id
 *
 * @return {Object} 
 */
function createButtonLink (type, text, id) {
    var uid = Math.round(Math.random() * 1e5)
    var template = '<a id="l{{ uid }}" class="img-link icon-20x20-' + 
        '{{ type }} btn btn-orange padded">{{ text }}</a>'

    var html = TemplateEngine(template, {
        type: type,
        text: text,
        uid: uid
    })

    var elem = document.createElement('div')
    elem.innerHTML = html
    elem = elem.firstChild

    var handler

    switch (type) {
    case 'village':
        handler = function () {
            $wds.openVillageInfo(id)
        }

        break
    case 'character':
        handler = function () {
            $wds.openCharacterProfile(id)
        }

        break
    }

    elem.addEventListener('click', handler)

    return {
        html: html,
        id: 'l' + uid,
        elem: elem
    }
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
