require([
    'Lockr'
], function (Lockr) {
    var $player = $model.getSelectedCharacter()

    Lockr.prefix = $player.getId() + '_farmOverflow_'
})
