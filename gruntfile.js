module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            prod: {
                src: [
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
                    'src/interface/button-link.js',

                    'src/modules/farm/farm.js',
                    'src/modules/farm/commander.js',
                    'src/modules/farm/village.js',
                    'src/modules/farm/analytics.js',
                    'src/modules/farm/locale.js',
                    'src/modules/farm/interface/farm.js',
                    'src/modules/farm/init.js',

                    'src/modules/queue/queue.js',
                    'src/modules/queue/analytics.js',
                    'src/modules/queue/locale.js',
                    'src/modules/queue/interface/queue.js',
                    'src/modules/queue/init.js',

                    'src/footer.js'
                ],
                dest: 'dist/temp/<%= pkg.name %>.js'
            }
        },
        eslint: {
            options: {
                configFile: '.eslintrc.json'
            },
            all: ['src/*.js']
        },
        less: {
            all: {
                options: {
                    compress: true,
                    ieCompat: false
                },
                files: {
                    'dist/temp/interface/style.css': 'src/interface/style.less',
                    'dist/temp/modules/farm/interface/style.css': 'src/modules/farm/interface/style.less',
                    'dist/temp/modules/queue/interface/style.css': 'src/modules/queue/interface/style.less'
                }
            }
        },
        htmlmin: {
            all: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    ignoreCustomFragments: [/\{\{[\s\S]*?\}\}/, /\<\#[\s\S]*?\#\>/]
                },
                files: {
                    'dist/temp/interface/button.html': 'src/interface/button.html',
                    'dist/temp/modules/farm/interface/window.html': 'src/modules/farm/interface/window.html',
                    'dist/temp/modules/farm/interface/event.html': 'src/modules/farm/interface/event.html',
                    'dist/temp/modules/queue/interface/window.html': 'src/modules/queue/interface/window.html',
                    'dist/temp/modules/queue/interface/command.html': 'src/modules/queue/interface/command.html'
                }
            }
        },
        replace: {
            all: {
                options: {
                    prefix: '___',
                    patterns: [{
                        json: {
                            title: '<%= pkg.title %>',
                            farmOverlflowVersion: '<%= pkg.farmOverlflowVersion %>',
                            commandQueueVersion: '<%= pkg.commandQueueVersion %>',
                            license: '<%= pkg.license %>',
                            author: '<%= pkg.author %>',
                            authorName: '<%= pkg.author.name %>',
                            authorEmail: '<%= pkg.author.email %>',
                            authorUrl: '<%= pkg.author.url %>',
                            date: '<%= new Date() %>',
                            build: '<%= pkg.build %>',
                            farmAnalytics: '<%= pkg.farmAnalytics %>',
                            queueAnalytics: '<%= pkg.queueAnalytics %>',

                            // script replaces
                            htmlFarmWindow: '<%= grunt.file.read("dist/temp/modules/farm/interface/window.html") %>',
                            htmlFarmEvent: '<%= grunt.file.read("dist/temp/modules/farm/interface/event.html") %>',
                            htmlQueueWindow: '<%= grunt.file.read("dist/temp/modules/queue/interface/window.html") %>',
                            htmlQueueCommand: '<%= grunt.file.read("dist/temp/modules/queue/interface/command.html") %>',
                            htmlButton: '<%= grunt.file.read("dist/temp/interface/button.html") %>',

                            cssWindow: '<%= grunt.file.read("dist/temp/interface/style.css") %>',
                            cssFarm: '<%= grunt.file.read("dist/temp/modules/farm/interface/style.css") %>',
                            cssQueue: '<%= grunt.file.read("dist/temp/modules/queue/interface/style.css") %>',

                            css: '<%= grunt.file.read("dist/temp/interface/style.css") %>',
                            
                            langFarm: '<%= grunt.file.read("dist/temp/modules/farm/locales.json") %>',
                            langQueue: '<%= grunt.file.read("dist/temp/modules/queue/locales.json") %>'
                        }
                    }]
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
                files: {
                    'dist/temp/modules/farm/locales.json': 'src/modules/farm/locales.json',
                    'dist/temp/modules/queue/locales.json': 'src/modules/queue/locales.json'
                }
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
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks('grunt-minjson')

    grunt.registerTask('build', [
        'eslint',
        'concat',
        'less',
        'htmlmin',
        'minjson',
        'replace',
        'uglify',
        'clean'
    ])
}
