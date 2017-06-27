define('FarmOverflow/ready', function () {
    return function (callback) {
        var $map = document.querySelector('#map')
        var $mapScope = angular.element($map).scope()

        if ($mapScope.isInitialized) {
            callback()
        } else {
            var $root = angular.element(document).scope()
            var $eventType = injector.get('eventTypeProvider')

            $root.$on($eventType.MAP_INITIALIZED, callback)
        }
    }
})