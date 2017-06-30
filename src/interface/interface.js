define('TWOverflow/Interface', [
    'queues/EventQueue',
    'ejs'
], function (
    $eventQueue,
    ejs
) {
    var interfaceInstances = []

    function closeAllInstances () {
        interfaceInstances.forEach(function (ui) {
            ui.closeWindow()
        })
    }
    
    function buildStyle (id, css) {
        var $style = document.createElement('style')
        $style.type = 'text/css'
        $style.id = 'farmOverflow-style-' + id
        $style.innerHTML = css

        document.querySelector('head').appendChild($style)
    }

    buildStyle('own', '___cssWindow')

    /**
     * @class
     */
    function Interface (windowId, settings) {
        var self = this

        interfaceInstances.push(self)

        self.windowId = windowId
        self.activeTab = settings.activeTab
        self.settings = settings

        buildStyle(windowId, settings.css)

        self.buildWindow()
        self.bindTabs()
        self.setCollapse()
        self.setTooltips()
        self.setCheckboxes()

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
        this.resizeWindowFrame()
    }

    /**
     * Atualiza a area ocupada pela janela para que o resto do jogo
     * se adapite a ela.
     */
    Interface.prototype.resizeWindowFrame = function () {
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

        this.resizeWindowFrame()
    }

    /**
     * Altera o estado da janela.
     *
     * @param {String} state - Estado da visibilidade (hidden || visible)
     */
    Interface.prototype.toggleWindow = function (state) {
        this.$window.style.visibility = state
        this.$wrapper.toggleClass('window-open')

        this.resizeWindowFrame()
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

    /**
     * Remove todo html/eventos criados.
     */
    Interface.prototype.destroy = function () {
        document.querySelector('#farmOverflow-style-' + this.windowId).remove()
        this.$window.remove()
    }

    /**
     * Adiciona botão para ocutar/mostrar conteúdo da sessão
     */
    Interface.prototype.setCollapse = function () {
        var self = this

        self.$window.querySelectorAll('.twx-section.collapse').forEach(function ($section) {
            var visible = !$section.classList.contains('hidden-content')

            var $collapse = document.createElement('span')
            $collapse.className = 'min-max-btn'

            var $icon = document.createElement('a')
            $icon.className = 'btn-orange icon-26x26-' + (visible ? 'minus' : 'plus')

            if (!visible) {
                $section.nextSibling.style.display = 'none'
            }

            $collapse.appendChild($icon)
            $section.appendChild($collapse)

            $collapse.addEventListener('click', function () {
                var state = $section.nextSibling.style.display

                if (state === 'none') {
                    $section.nextSibling.style.display = ''
                    $icon.className = $icon.className.replace('plus', 'minus')
                    visible = true
                } else {
                    $section.nextSibling.style.display = 'none'
                    $icon.className = $icon.className.replace('minus', 'plus')
                    visible = false
                }

                self.$scrollbar.recalc()
            })
        })
    }

    Interface.prototype.setTooltips = function () {
        var self = this

        var $nativeTooltip = $('#tooltip')
        var $tooltipContent = $nativeTooltip.find('.tooltip-content-wrapper')

        self.$window.querySelectorAll('[tooltip]').forEach(function ($elem) {
            var text = $elem.getAttribute('tooltip')
            $elem.removeAttribute('tooltip')

            $elem.addEventListener('mouseenter', function (event) {
                $root.$broadcast($eventType.TOOLTIP_SHOW, 'twoverflow-tooltip', text, true, event)
            })

            $elem.addEventListener('mouseleave', function () {
                $root.$broadcast($eventType.TOOLTIP_HIDE, 'twoverflow-tooltip')
            })
        })
    }

    Interface.prototype.setCheckboxes = function () {
        this.$window.querySelectorAll('input[type=checkbox]').forEach(function ($elem) {
            $elem.addEventListener('click', function () {
                $($elem).parent().toggleClass('icon-26x26-checkbox-checked')
            })
        })
    }

    Interface.prototype.isVisible = function () {
        return this.$window.style.visibility === 'visible'
    }

    return Interface
})
