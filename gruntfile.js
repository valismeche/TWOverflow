module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            prod: {
                src: [
                    'src/libs/lockr.js',
                    'src/header.js',
                    'src/utils.js',
                    'src/core.js',
                    'src/commander.js',
                    'src/village.js',
                    'src/frontbutton.js',
                    'src/interface.js',
                    'src/analytics.js',
                    'src/footer.js',
                    'src/initialize.js'
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
                    'dist/temp/farm/window.html': 'src/interface/farm/window.html',
                    'dist/temp/farm/event.html': 'src/interface/farm/event.html',
                    'dist/temp/button.html': 'src/interface/button.html'
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
                            license: '<%= pkg.license %>',
                            author: '<%= pkg.author %>',
                            authorName: '<%= pkg.author.name %>',
                            authorEmail: '<%= pkg.author.email %>',
                            authorUrl: '<%= pkg.author.url %>',
                            date: '<%= new Date() %>',
                            build: '<%= pkg.build %>',
                            analytics: '<%= pkg.analytics %>',

                            // script replaces
                            htmlFarmWindow: '<%= grunt.file.read("dist/temp/farm/window.html") %>',
                            htmlFarmEvent: '<%= grunt.file.read("dist/temp/farm/event.html") %>',
                            htmlButton: '<%= grunt.file.read("dist/temp/button.html") %>',
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
            prod: {
                files: {
                    'dist/<%= pkg.name %>.min.js': 'dist/<%= pkg.name %>.js'
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

    grunt.registerTask('build', [
        'eslint',
        'concat',
        'less',
        'htmlmin',
        'replace',
        'uglify',
        'clean'
    ])
}
