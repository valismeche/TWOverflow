define('FarmOverflow/Interface', [
    'queues/EventQueue',
    'ejs'
], function (
    $eventQueue,
    ejs
) {
    ejs.delimiter = '#'
    
    var interfaceInstances = []

    function closeAllInstances () {
        interfaceInstances.forEach(function (ui) {
            ui.closeWindow()
        })
    }

    $hotkeys.add('esc', closeAllInstances, ['INPUT', 'SELECT', 'TEXTAREA'])

    /**
     * Injeta o CSS geral de toda UI do FarmOverflow.
     */
    function buildStyle () {
        var $style = document.createElement('style')
        $style.type = 'text/css'
        $style.id = 'farmOverflow-style'
        $style.innerHTML = '___cssStyle'

        document.querySelector('head').appendChild($style)
    }

    buildStyle()

    /**
     * @class
     */
    function Interface (windowId, settings) {
        var self = this

        interfaceInstances.push(self)

        self.windowId = windowId
        self.activeTab = settings.activeTab
        self.settings = settings

        self.buildWindow()
        self.bindTabs()

        var $close = self.$window.querySelector('.farmOverflow-close')

        $close.addEventListener('click', function () {
            self.closeWindow()
        })

        $root.$on($eventType.WINDOW_CLOSED, function () {
            self.closeWindow()
        })

        return self
    }

    /**
     * Injeta a estrutura.
     */
    Interface.prototype.buildWindow = function () {
        this.$wrapper = $('#wrapper')

        this.$window = document.createElement('section')
        this.$window.id = this.windowId
        this.$window.className = 'farmOverflow-window twx-window screen left'

        this.$window.innerHTML = ejs.render(this.settings.template, this.settings.replaces)
        this.$wrapper.append(this.$window)

        this.$scrollbar = jsScrollbar(this.$window.querySelector('.win-main'))
    }

    /**
     * Abrir janela.
     */
    Interface.prototype.openWindow = function () {
        $wms.closeAll()
        closeAllInstances()

        this.$window.style.visibility = 'visible'
        this.$wrapper.addClass('window-open')

        $eventQueue.trigger($eventQueue.types.RESIZE, {
            'instant': true,
            'right': true
        })
    }

    /**
     * Fecha janela.
     */
    Interface.prototype.closeWindow = function () {
        this.$window.style.visibility = 'hidden'
        this.$wrapper.removeClass('window-open')

        $eventQueue.trigger($eventQueue.types.RESIZE, {
            'instant': true,
            'right': true
        })
    }

    /**
     * Altera o estado da janela.
     *
     * @param {String} state - Estado da visibilidade (hidden || visible)
     */
    Interface.prototype.toggleWindow = function (state) {
        this.$window.style.visibility = state
        this.$wrapper.toggleClass('window-open')

        $eventQueue.trigger($eventQueue.types.RESIZE, {
            'instant': true,
            'right': true
        })
    }

    /**
     * Controla o estado das abas.
     */
    Interface.prototype.tabsState = function () {
        var self = this

        self.$tabs.forEach(function ($tab) {
            var name = $tab.getAttribute('tab')

            var $content = self.$window.querySelector('.farmOverflow-content-' + name)
            var $buttons = self.$window.querySelectorAll('.farmOverflow-button-' + name)
            var $inner = $tab.querySelector('.tab-inner > div')
            var $a = $tab.querySelector('a')

            if (self.activeTab === name) {
                $content.style.display = ''
                $tab.classList.add('tab-active')
                $inner.classList.add('box-border-light')
                $a.classList.remove('btn-icon', 'btn-orange')

                if ($buttons.length) {
                    $buttons.forEach(function ($button) {
                        $button.style.display = ''
                    })
                }

                self.$scrollbar.content = $content
            } else {
                $content.style.display = 'none'
                $tab.classList.remove('tab-active')
                $inner.classList.remove('box-border-light')
                $a.classList.add('btn-icon', 'btn-orange')

                if ($buttons.length) {
                    $buttons.forEach(function ($button) {
                        $button.style.display = 'none'
                    })
                }
            }

            self.$scrollbar.recalc()
        })
    }

    /**
     * Listener das abas.
     */
    Interface.prototype.bindTabs = function () {
        var self = this

        self.$tabs = self.$window.querySelectorAll('.tab')

        self.$tabs.forEach(function ($tab) {
            var name = $tab.getAttribute('tab')
            
            $tab.addEventListener('click', function () {
                self.activeTab = name
                self.tabsState()
            })
        })

        self.tabsState()
    }

    return Interface
})
