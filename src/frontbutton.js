define('FarmOverflow/FrontButton', function () {
    function FrontButton (options) {
        this.options = angular.merge({}, {
            label: '',
            className: '',
            classHover: '',
            classBlur: '',
            hoverText: ''
        }, options)

        this.buildWrapper()
        this.appendButton()

        if (options.click) {
            this.click(options.click)
        }

        let $label = this.$elem.find('.label')
        let $quick = this.$elem.find('.quickview')

        if (this.options.classHover) {
            this.$elem.on('mouseenter', () => {
                this.$elem.addClass(this.options.classHover)
                this.$elem.removeClass(this.options.classBlur)

                let text = this.options.hoverText

                $quick.html(typeof text === 'function' ? text() : text)
                $label.hide()
                $quick.show()
            })
        }

        if (this.options.classBlur) {
            this.$elem.on('mouseleave', () => {
                this.$elem.addClass(this.options.classBlur)
                this.$elem.removeClass(this.options.classHover)

                $quick.hide()
                $label.show()
            })
        }

        return this
    }

    FrontButton.prototype.updateHoverText = function (text) {
        this.$elem.find('.quickview').html(text)
    }

    FrontButton.prototype.buildWrapper = function () {
        let $wrapper = document.getElementById('farmOverflow-leftbar')

        if (!$wrapper) {
            $wrapper = document.createElement('div')
            $wrapper.id = 'farmOverflow-leftbar'
            $('#toolbar-left').prepend($wrapper)
        }

        this.$wrapper = $wrapper
    }

    FrontButton.prototype.appendButton = function () {
        let html = TemplateEngine('___htmlButton', {
            className: this.options.className,
            label: this.options.label
        })

        let $container = document.createElement('div')
        $container.innerHTML = html
        let $elem = $container.children[0]

        this.$wrapper.appendChild($elem)
        this.$elem = $($elem)
    }

    FrontButton.prototype.click = function (handler) {
        this.$elem.click(handler)
    }

    return FrontButton
})
