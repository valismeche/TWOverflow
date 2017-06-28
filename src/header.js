/*!
 * ___title v___version
 *
 * Copyright ___authorName <___authorEmail>
 * __license License
 *
 * ___date
 */

;(function (window, undefined) {

$root = angular.element(document).scope()
$model = injector.get('modelDataService')
$socket = injector.get('socketService')
$route = injector.get('routeProvider')
$eventType = injector.get('eventTypeProvider')
$filter = injector.get('$filter')
$wds = injector.get('windowDisplayService')
$wms = injector.get('windowManagerService')
$hotkeys = injector.get('hotkeys')
$armyService = injector.get('armyService')
$villageService = injector.get('villageService')
$autoCompleteService = injector.get('autoCompleteService')
$presetList = $model.getPresetList()
readableDateFilter = $filter('readableDateFilter')
readableMillisecondsFilter = $filter('readableMillisecondsFilter')
