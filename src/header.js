/*!
 * ___title v___version
 *
 * Copyright ___authorName <___authorEmail>
 * __license License
 *
 * ___date
 */

;(function (window, undefined) {

'use strict'

var $root = angular.element(document).scope()
var $model = injector.get('modelDataService')
var $socket = injector.get('socketService')
var $route = injector.get('routeProvider')
var $eventType = injector.get('eventTypeProvider')
var $filter = injector.get('$filter')
var $wds = injector.get('windowDisplayService')
var $wms = injector.get('windowManagerService')
var $hotkeys = injector.get('hotkeys')
var $armyService = injector.get('armyService')
var $villageService = injector.get('villageService')
var $autoCompleteService = injector.get('autoCompleteService')
var $presetList = $model.getPresetList()
