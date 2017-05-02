module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            prod: {
                src: [
                    'src/libs/lockr.js',
                    'src/core.js',
                    'src/commander.js',
                    'src/village.js',
                    'src/interface.js',
                    'src/analytics.js',
                    'src/initialize.js'
                ],
                dest: 'dist/temp/<%= pkg.name %>.js'
            },
            dev: {
                src: [
                    'src/libs/lockr.js',
                    'src/core.js',
                    'src/commander.js',
                    'src/village.js',
                    'src/interface.js',
                    'src/analytics.js',
                    'src/debug.js'
                ],
                dest: 'dist/temp/<%= pkg.name %>.dev.js'
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
                    'dist/temp/style.css': 'src/interface/style.less'
                }
            }
        },
        htmlmin: {
            all: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    'dist/temp/window.html': 'src/interface/window.html',
                    'dist/temp/button.html': 'src/interface/button.html',
                    'dist/temp/event.html': 'src/interface/event.html'
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
                            version: '<%= pkg.version %>',
                            licence: '<%= pkg.licence %>',
                            author: '<%= pkg.author %>',
                            authorName: '<%= pkg.author.name %>',
                            authorEmail: '<%= pkg.author.email %>',
                            authorUrl: '<%= pkg.author.url %>',
                            date: '<%= new Date() %>',
                            build: '<%= pkg.build %>',
                            analytics: '<%= pkg.analytics %>',

                            // script replaces
                            htmlWindow: '<%= grunt.file.read("dist/temp/window.html") %>',
                            htmlButton: '<%= grunt.file.read("dist/temp/button.html") %>',
                            htmlEvent: '<%= grunt.file.read("dist/temp/event.html") %>',
                            cssStyle: '<%= grunt.file.read("dist/temp/style.css") %>',
                            langPt_br: '<%= grunt.file.read("src/locale/pt_br.json") %>',
                            langEn_us: '<%= grunt.file.read("src/locale/en_us.json") %>'
                        }
                    }]
                },
                files: [{
                    expand: true,
                    flatten: true,
                    src: [
                        'dist/temp/<%= pkg.name %>.js',
                        'dist/temp/<%= pkg.name %>.dev.js'
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
            prod: {
                files: {
                    'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
                }
            }
        },
        clean: {
            all: ['dist/temp']
        },
        buildnumber: {
            package: {}
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
    grunt.loadNpmTasks('grunt-build-number')

    grunt.registerTask('build', [
        'eslint',
        'concat:prod',
        'concat:dev',
        'less',
        'htmlmin',
        'replace',
        'uglify',
        'clean',
        'buildnumber'
    ])
}
