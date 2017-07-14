define('TWOverflow/ready', function () {
    return function (callback) {
        var $map = document.querySelector('#map')
        var $mapScope = angular.element($map).scope()

        if ($mapScope.isInitialized) {
            callback()
        } else {
            rootScope.$on(eventTypeProvider.MAP_INITIALIZED, callback)
        }
    }
})
