define('FarmOverflow/FrontButton', [
    'ejs'
], function (ejs) {
    function FrontButton (options) {
        var self = this

        self.options = angular.merge({}, {
            label: '',
            className: '',
            classHover: '',
            classBlur: '',
            hoverText: ''
        }, options)

        self.buildWrapper()
        self.appendButton()

        if (options.click) {
            self.click(options.click)
        }

        var $label = self.$elem.find('.label')
        var $quick = self.$elem.find('.quickview')

        if (self.options.classHover) {
            self.$elem.on('mouseenter', function () {
                self.$elem.addClass(self.options.classHover)
                self.$elem.removeClass(self.options.classBlur)

                var text = self.options.hoverText

                $quick.html(typeof text === 'function' ? text() : text)
                $label.hide()
                $quick.show()
            })
        }

        if (self.options.classBlur) {
            self.$elem.on('mouseleave', function () {
                self.$elem.addClass(self.options.classBlur)
                self.$elem.removeClass(self.options.classHover)

                $quick.hide()
                $label.show()
            })
        }

        return self
    }

    FrontButton.prototype.updateHoverText = function (text) {
        this.$elem.find('.quickview').html(text)
    }

    FrontButton.prototype.buildWrapper = function () {
        var $wrapper = document.getElementById('farmOverflow-leftbar')

        if (!$wrapper) {
            $wrapper = document.createElement('div')
            $wrapper.id = 'farmOverflow-leftbar'
            $('#toolbar-left').prepend($wrapper)
        }

        this.$wrapper = $wrapper
    }

    FrontButton.prototype.appendButton = function () {
        var html = ejs.render('___htmlButton', {
            className: this.options.className,
            label: this.options.label
        })

        var $container = document.createElement('div')
        $container.innerHTML = html
        var $elem = $container.children[0]

        this.$wrapper.appendChild($elem)
        this.$elem = $($elem)
    }

    FrontButton.prototype.click = function (handler) {
        this.$elem.click(handler)
    }

    FrontButton.prototype.destroy = function () {
        this.$elem.remove()
    }

    return FrontButton
})
