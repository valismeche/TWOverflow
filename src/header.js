/*!
 * __overflow_title v__overflow_version
 *
 * Copyright __overflow_author_name <__overflow_author_email>
 * __overflow_license License
 *
 * __overflow_date
 */

;(function (window, undefined) {

var rootScope = angular.element(document).scope()
var modelDataService = injector.get('modelDataService')
var socketService = injector.get('socketService')
var routeProvider = injector.get('routeProvider')
var eventTypeProvider = injector.get('eventTypeProvider')
var windowDisplayService = injector.get('windowDisplayService')
var windowManagerService = injector.get('windowManagerService')
var angularHotkeys = injector.get('hotkeys')
var armyService = injector.get('armyService')
var villageService = injector.get('villageService')
var $filter = injector.get('$filter')
