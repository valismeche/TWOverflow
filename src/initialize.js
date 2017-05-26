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

    let initialize = function () {
        let $model = injector.get('modelDataService')
        let $player = $model.getSelectedCharacter()

        analytics.init($player)

        Lockr.prefix = `${$player.getId()}_farmOverflow_`

        let farmOverflow = new Farm()
        FarmInterface(farmOverflow)
        QueueInterface(Queue)
    }

    let $map = document.querySelector('#map')
    let $mapScope = angular.element($map).scope()

    if ($mapScope.isInitialized) {
        initialize()
    } else {
        let $root = angular.element(document).scope()
        let $eventType = injector.get('eventTypeProvider')

        $root.$on($eventType.MAP_INITIALIZED, initialize)
    }
})
