require([
    'TWOverflow/ready',
    'Lockr',
    'ejs'
], function (
    ready,
    Lockr,
    ejs
) {
    ready(function () {
        var $player = $model.getSelectedCharacter()

        // EJS settings
        
        ejs.delimiter = '#'

        // Lockr settings
        
        Lockr.prefix = $player.getId() + '_farmOverflow_'

        // Interface settings
        
        $hotkeys.add('esc', function () {
            $root.$broadcast($eventType.WINDOW_CLOSED)
        }, ['INPUT', 'SELECT', 'TEXTAREA'])
    })
})
