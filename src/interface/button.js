define('TWOverflow/FrontButton', [
    'ejs'
], function (ejs) {
    function FrontButton (label, options) {
        var self = this

        self.options = angular.merge({
            label: label,
            className: '',
            classHover: 'expand-button',
            classBlur: 'contract-button'
        }, options)

        self.buildWrapper()
        self.appendButton()

        var $label = self.$elem.find('.label')
        var $quick = self.$elem.find('.quickview')

        if (self.options.classHover) {
            self.$elem.on('mouseenter', function () {
                self.$elem.addClass(self.options.classHover)
                self.$elem.removeClass(self.options.classBlur)

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

    FrontButton.prototype.updateQuickview = function (text) {
        this.$elem.find('.quickview').html(text)
    }

    FrontButton.prototype.hover = function (handler) {
        this.$elem.on('mouseenter', handler)
    }

    FrontButton.prototype.click = function (handler) {
        this.$elem.on('click', handler)
    }

    FrontButton.prototype.buildWrapper = function () {
        var $wrapper = document.getElementById('twOverflow-leftbar')

        if (!$wrapper) {
            $wrapper = document.createElement('div')
            $wrapper.id = 'twOverflow-leftbar'
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

    FrontButton.prototype.destroy = function () {
        this.$elem.remove()
    }

    return FrontButton
})
