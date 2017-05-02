;(function initFarmOverflow () {
    if (typeof __farmOverflow !== 'undefined') {
        return false
    }

    __farmOverflow = true

    let initialize = function () {
        let $model = injector.get('modelDataService')
        let $player = $model.getSelectedCharacter()

        Analytics.init($player)
        
        Lockr.prefix = `${$player.getId()}_farmOverflow_`

        let farmOverflow = new FarmOverflow()
        let interface = new FarmOverflowInterface(farmOverflow)
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
})()
