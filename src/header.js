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

let $root = angular.element(document).scope()
let $model = injector.get('modelDataService')
let $socket = injector.get('socketService')
let $route = injector.get('routeProvider')
let $eventType = injector.get('eventTypeProvider')
let $filter = injector.get('$filter')
let $wds = injector.get('windowDisplayService')
let $wms = injector.get('windowManagerService')
let $hotkeys = injector.get('hotkeys')
let $armyService = injector.get('armyService')
let $villageService = injector.get('villageService')

let $presetList = $model.getPresetList()

// Limpa qualquer text entre (, [, {, " & ' do nome dos presets
// para serem idetificados com o mesmo nome.
let rpreset = /(\(|\{|\[|\"|\')[^\)\}\]\"\']+(\)|\}|\]|\"|\')/
