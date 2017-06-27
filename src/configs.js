require([
    'FarmOverflow/ready',
    'Lockr'
], function (
    ready,
    Lockr
) {
    ready(function () {
        var $player = $model.getSelectedCharacter()

        Lockr.prefix = $player.getId() + '_farmOverflow_'
    })
})
