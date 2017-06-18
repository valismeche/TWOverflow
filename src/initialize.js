require([
    'FarmOverflow/Farm',
    'FarmOverflow/FarmInterface',
    'FarmOverflow/Queue',
    'FarmOverflow/QueueInterface',
    'FarmOverflow/analytics'
], function (Farm, FarmInterface, Queue, QueueInterface, analytics) {
    if (Farm.initialized) {
        return false
    } else {
        Farm.initialized = true
    }

    var initialize = function () {
        var $model = injector.get('modelDataService')
        var $player = $model.getSelectedCharacter()

        analytics.init($player)

        Lockr.prefix = $player.getId() + '_farmOverflow_'

        farmOverflow = new Farm()
        FarmInterface(farmOverflow)

        Queue.init()
        QueueInterface()
    }

    var $map = document.querySelector('#map')
    var $mapScope = angular.element($map).scope()

    if ($mapScope.isInitialized) {
        initialize()
    } else {
        var $root = angular.element(document).scope()
        var $eventType = injector.get('eventTypeProvider')

        $root.$on($eventType.MAP_INITIALIZED, initialize)
    }
})
