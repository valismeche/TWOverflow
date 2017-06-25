define('FarmOverflow/Queue/locale', [
    'conf/locale'
], function (gameLocale) {
    var langs = {}

    langs.pt_br = i18n.create(___langQueuePt)

    var gameLang = gameLocale.LANGUAGE

    var aliases = {
        pt_br: ['pt_pt'],
        en_us: ['en_dk']
    }

    for (var id in aliases) {
        if (aliases[id].includes(gameLang)) {
            gameLang = id
        }
    }

    var lang = gameLang in langs ? gameLang : 'pt_br'

    return langs[lang]
})