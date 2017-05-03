;(function debugFarmOverflow () {
    if (typeof farmOverflow !== 'undefined') {
        $('#farmOverflow-interface').remove()
        $('#farmOverflow-window').remove()
        $('#farmOverflow-style').remove()

        if (farmOverflow.commander.running) {
            farmOverflow.stop()
        }

        farmOverflow.activeListeners.forEach((unbind) => {
            unbind()
        })
    }
    
    __debug = true

    let initialize = function () {
        let $model = injector.get('modelDataService')
        let $player = $model.getSelectedCharacter()
        
        Lockr.prefix = `${$player.getId()}_farmOverflow_`

        farmOverflow = new FarmOverflow()
        interface = new FarmOverflowInterface(farmOverflow)
        interface.openWindow()
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
