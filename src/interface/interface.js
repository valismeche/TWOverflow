define('FarmOverflow/Interface', [
    'queues/EventQueue'
], function ($eventQueue) {
    let interfaceInstances = []

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
        let $style = document.createElement('style')
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
        interfaceInstances.push(this)

        this.windowId = windowId
        this.activeTab = settings.activeTab
        this.settings = settings

        this.buildWindow()
        this.bindTabs()

        let $close = this.$window.querySelector('.farmOverflow-close')

        $close.addEventListener('click', () => {
            this.closeWindow()
        })

        $root.$on($eventType.WINDOW_CLOSED, () => {
            this.closeWindow()
        })

        return this
    }

    /**
     * Injeta a estrutura.
     */
    Interface.prototype.buildWindow = function () {
        this.$wrapper = $('#wrapper')

        this.$window = document.createElement('section')
        this.$window.id = this.windowId
        this.$window.className = 'farmOverflow-window twx-window screen left'

        this.$window.innerHTML = TemplateEngine(
            this.settings.htmlTemplate,
            this.settings.htmlReplaces
        )
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
        for (let $tab of this.$tabs) {
            let name = $tab.getAttribute('tab')

            let $content = this.$window.querySelector(`.farmOverflow-content-${name}`)
            let $buttons = this.$window.querySelectorAll(`.farmOverflow-button-${name}`)
            let $inner = $tab.querySelector('.tab-inner > div')
            let $a = $tab.querySelector('a')

            if (this.activeTab === name) {
                $content.style.display = ''
                $tab.classList.add('tab-active')
                $inner.classList.add('box-border-light')
                $a.classList.remove('btn-icon', 'btn-orange')

                if ($buttons.length) {
                    $buttons.forEach(function ($button) {
                        $button.style.display = ''
                    })
                }

                this.$scrollbar.content = $content
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

            this.$scrollbar.recalc()
        }
    }

    /**
     * Listener das abas.
     */
    Interface.prototype.bindTabs = function () {
        this.$tabs = this.$window.querySelectorAll('.tab')

        for (let tab of this.$tabs) {
            let name = tab.getAttribute('tab')
            
            tab.addEventListener('click', () => {
                this.activeTab = name
                this.tabsState()
            })
        }

        this.tabsState()
    }

    return Interface
})
