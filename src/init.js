require([
    'TWOverflow/ready',
    'TWOverflow/locale'
], function (
    ready,
    Locale
) {
    Locale.create('common', __overflow_locales, 'en')
})
