require([
    'FarmOverflow',
    'FarmOverflow/Interface',
    'FarmOverflow/analytics'
], function (FarmOverflow, Interface, analytics) {
    let initialize = function () {
        let $model = injector.get('modelDataService')
        let $player = $model.getSelectedCharacter()

        analytics.init($player)

        Lockr.prefix = `${$player.getId()}_farmOverflow_`

        window.farmOverflow = new FarmOverflow()
        window.farmOverflowInterface = new Interface(farmOverflow)
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
