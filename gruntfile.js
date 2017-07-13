module.exports = function (grunt) {
    var modules = grunt.option('modules').split(',')

    var concat = [
        'src/libs/lockr.js',
        'src/libs/i18n.js',
        'src/libs/ejs.js',
        'src/header.js',
        'src/utils.js',
        'src/locale.js',
        'src/ready.js',
        'src/configs.js',
        'src/interface/interface.js',
        'src/interface/button.js',
        'src/interface/button-link.js'
    ]

    var css = {
        'dist/temp/interface/style.css': 'src/interface/style.less'
    }

    var html = {
        'dist/temp/interface/button.html': 'src/interface/button.html'
    }

    var replaces = [{
        json: {
            title: '<%= pkg.title %>',
            license: '<%= pkg.license %>',
            author: '<%= pkg.author %>',
            authorName: '<%= pkg.author.name %>',
            authorEmail: '<%= pkg.author.email %>',
            authorUrl: '<%= pkg.author.url %>',
            date: '<%= new Date() %>',
            build: '<%= pkg.build %>',
            htmlButton: '<%= grunt.file.read("dist/temp/interface/button.html") %>',
            cssWindow: '<%= grunt.file.read("dist/temp/interface/style.css") %>'
        }
    }]

    var locales = {}

    if (modules.includes('farm')) {
        concat = concat.concat([
            'src/modules/farm/farm.js',
            'src/modules/farm/commander.js',
            'src/modules/farm/village.js',
            'src/modules/farm/single-cycle.js',
            'src/modules/farm/analytics.js',
            'src/modules/farm/locale.js',
            'src/modules/farm/interface/farm.js',
            'src/modules/farm/init.js'
        ])

        css['dist/temp/modules/farm/interface/style.css'] = 'src/modules/farm/interface/style.less'

        html['dist/temp/modules/farm/interface/window.html'] = 'src/modules/farm/interface/window.html'
        html['dist/temp/modules/farm/interface/event.html'] = 'src/modules/farm/interface/event.html'

        replaces.push({
            json: {
                farmVersion: '<%= pkg.farmVersion %>',
                farmAnalytics: '<%= pkg.farmAnalytics %>',
                htmlFarmWindow: '<%= grunt.file.read("dist/temp/modules/farm/interface/window.html") %>',
                htmlFarmEvent: '<%= grunt.file.read("dist/temp/modules/farm/interface/event.html") %>',
                cssFarm: '<%= grunt.file.read("dist/temp/modules/farm/interface/style.css") %>',
                langFarm: '<%= grunt.file.read("dist/temp/modules/farm/locales.json") %>'
            }
        })

        locales['dist/temp/modules/farm/locales.json'] = 'src/modules/farm/locales.json'
    }

    if (modules.includes('queue')) {
        concat = concat.concat([
            'src/modules/queue/queue.js',
            'src/modules/queue/analytics.js',
            'src/modules/queue/locale.js',
            'src/modules/queue/interface/queue.js',
            'src/modules/queue/init.js'
        ])

        css['dist/temp/modules/queue/interface/style.css'] = 'src/modules/queue/interface/style.less'

        html['dist/temp/modules/queue/interface/window.html'] = 'src/modules/queue/interface/window.html'
        html['dist/temp/modules/queue/interface/command.html'] = 'src/modules/queue/interface/command.html'

        replaces.push({
            json: {
                queueVersion: '<%= pkg.queueVersion %>',
                queueAnalytics: '<%= pkg.queueAnalytics %>',
                htmlQueueWindow: '<%= grunt.file.read("dist/temp/modules/queue/interface/window.html") %>',
                htmlQueueCommand: '<%= grunt.file.read("dist/temp/modules/queue/interface/command.html") %>',
                cssQueue: '<%= grunt.file.read("dist/temp/modules/queue/interface/style.css") %>',
                langQueue: '<%= grunt.file.read("dist/temp/modules/queue/locales.json") %>'
            }
        })

        locales['dist/temp/modules/queue/locales.json'] = 'src/modules/queue/locales.json'
    }

    if (modules.includes('deposit')) {
        concat = concat.concat([
            'src/modules/deposit/deposit.js',
            'src/modules/deposit/second-village.js',
            'src/modules/deposit/interface/deposit.js',
            'src/modules/deposit/init.js'
        ])
    }

    concat.push('src/footer.js')

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            prod: {
                src: concat,
                dest: 'dist/temp/<%= pkg.name %>.js'
            }
        },
        eslint: {
            options: {
                configFile: '.eslintrc.json',
                quiet: true
            },
            all: ['src/**/*.js']
        },
        less: {
            all: {
                options: {
                    compress: true,
                    ieCompat: false
                },
                files: css
            }
        },
        htmlmin: {
            all: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    ignoreCustomFragments: [/\<\#[\s\S]*?\#\>/]
                },
                files: html
            }
        },
        replace: {
            all: {
                options: {
                    prefix: '___',
                    patterns: replaces
                },
                files: [{
                    expand: true,
                    flatten: true,
                    src: [
                        'dist/temp/<%= pkg.name %>.js'
                    ],
                    dest: 'dist/'
                }]
            }
        },
        uglify: {
            options: {
                sourceMap: true,
                sourceMapName: 'dist/<%= pkg.name %>.map',
                banner: '/*! <%= pkg.name %>.min.js@<%= pkg.version %> | Licence <%= pkg.license %> */'
            },
            build: {
                files: {
                    'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
                }
            }
        },
        minjson: {
            build: {
                files: locales
            }
        },
        clean: {
            all: ['dist/temp']
        }
    })

    grunt.loadNpmTasks('grunt-eslint')
    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-less')
    grunt.loadNpmTasks('grunt-contrib-htmlmin')
    grunt.loadNpmTasks('grunt-replace')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks('grunt-minjson')

    var tasks = [
        'eslint',
        'concat',
        'less',
        'htmlmin',
        'minjson',
        'replace'
    ]

    if (grunt.option('prod')) {
        grunt.loadNpmTasks('grunt-contrib-uglify')
        tasks.push('uglify')
    }

    tasks.push('clean')

    grunt.registerTask('build', tasks)
}
