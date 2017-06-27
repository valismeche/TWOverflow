define('FarmOverflow/locale', [
    'conf/locale',
    'i18n'
], function (gameLocale, i18n) {
    var gameSelectedLang = gameLocale.LANGUAGE
    var aliases = {
        pt_br: ['pt_pt'],
        en_us: ['en_dk']
    }

    function Locale (langData, defaultLang) {
        var hasGameLang = langData.hasOwnProperty(gameSelectedLang)
        var selected = getAlias(hasGameLang ? gameSelectedLang : defaultLang)
        var langs = {}

        for (var id in langData) {
            langs[id] = i18n.create({
                values: langData[id]
            })
        }

        function ref () {
            return langs[selected].apply(this, arguments)
        }

        ref.change = function (id) {
            var newLang = getAlias(id)

            if (langs.hasOwnProperty(newLang)) {
                selected = newLang
            } else {
                console.error('Language ' + id + ' not created!')

                selected = defaultLang
            }
        }

        return ref
    }

    function getAlias (id) {
        for (var _id in aliases) {
            if (aliases[_id].includes(id)) {
                return aliases[_id]
            }
        }

        return id
    }

    return Locale
})
