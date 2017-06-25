define('FarmOverflow/Farm/locale', [
    'conf/locale'
], function (gameLocale) {
    return function (farmOverflow) {
        var langs = {}

        langs.pt_br = i18n.create(___langFarmPt)
        langs.en_us = i18n.create(___langFarmEn)

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

        if (farmOverflow.settings.language) {
            farmOverflow.lang = langs[farmOverflow.settings.language]
        } else {
            var lang = gameLang in langs ? gameLang : 'en_us'

            farmOverflow.lang = langs[lang]
            farmOverflow.settings.language = lang
        }
    }
})