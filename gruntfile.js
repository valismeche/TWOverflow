var fs = require('fs')
var glob = require('glob')
var path = require('path')
var mkdirp = require('mkdirp')
var temp = 'dist/temp'

var modules = []
var overflow = {
    js: [],
    html: {},
    css: {},
    replaces: [], // array!
    locales: {}
}

var addModule = function (moduleId) {
    var modulePath = `src/modules/${moduleId}`
    var data = {
        id: moduleId,
        js: [],
        css: [],
        html: [],
        replaces: {}, // object!
        locales: false
    }

    if (fs.existsSync(`${modulePath}/module.json`)) {
        var modulePackage = JSON.parse(fs.readFileSync(`${modulePath}/module.json`, 'utf8'))

        for (var key in modulePackage) {
            data.replaces[`${moduleId}_${key}`] = modulePackage[key]
        }
    } else {
        return console.error(`Module "${moduleId}" missing "module.json"`)
    }

    var source = glob.sync(`${modulePath}/source/*.js`, {
        ignore: [
            `${modulePath}/source/${moduleId}.js`,
            `${modulePath}/source/init.js`
        ]
    })

    source.forEach(function (filePath) {
        data.js.push(filePath)
    })

    if (fs.existsSync(`${modulePath}/source/${moduleId}.js`)) {
        data.js.unshift(`${modulePath}/source/${moduleId}.js`)
    } else {
        return console.error(`Module "${moduleId}"" missing "${moduleId}.js"`)
    }

    var hasInterfacePath = fs.existsSync(`${modulePath}/interface`)
    var hasInterfaceFile = fs.existsSync(`${modulePath}/interface/interface.js`)

    if (hasInterfacePath && hasInterfaceFile) {
        data.js.push(`${modulePath}/interface/interface.js`)

        data.html = glob.sync(`${modulePath}/interface/*.html`)
        data.css = glob.sync(`${modulePath}/interface/*.less`)

        data.html.forEach(function (htmlPath) {
            var filename = path.basename(htmlPath, '.html')
            data.replaces[`${moduleId}_html_${filename}`] = htmlPath
        })

        data.css.forEach(function (cssPath) {
            var filename = path.basename(cssPath, '.less')
            data.replaces[`${moduleId}_css_${filename}`] = cssPath
        })
    }

    if (fs.existsSync(`${modulePath}/locales`)) {
        data.locales = glob.sync(`${modulePath}/locales/*.json`)
    }

    if (fs.existsSync(`${modulePath}/source/init.js`)) {
        data.js.push(`${modulePath}/source/init.js`)
    } else {
        return console.error(`Module "${moduleId}"" missing "init.js"`)
    }

    modules.push(data)
}

fs.readdirSync('src/modules/').forEach(function (module,) {
    addModule(module)
})

module.exports = function (grunt) {
    overflow.js = overflow.js.concat([
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
    ])
    overflow.css[`${temp}/src/interface/style.css`] = 'src/interface/style.less'
    overflow.html[`${temp}/src/interface/button.html`] = 'src/interface/button.html'
    overflow.replaces.push({
        json: {
            overflow_title: '<%= pkg.title %>',
            overflow_version: '<%= pkg.version %>',
            overflow_license: '<%= pkg.license %>',
            overflow_author: '<%= pkg.author %>',
            overflow_author_name: '<%= pkg.author.name %>',
            overflow_author_email: '<%= pkg.author.email %>',
            overflow_author_url: '<%= pkg.author.url %>',
            overflow_date: '<%= new Date() %>',
            overflow_build: '<%= pkg.build %>',
            overflow_interface_html_button: `<%= grunt.file.read("${temp}/src/interface/button.html") %>`,
            overflow_interface_css_window: `<%= grunt.file.read("${temp}/src/interface/style.css") %>`
        }
    })

    modules.forEach(function (module) {
        overflow.js = overflow.js.concat(module.js)

        module.html.forEach(function (htmlPath) {
            overflow.html[`${temp}/${htmlPath}`] = htmlPath
        })

        module.css.forEach(function (lessPath) {
            var cssPath = lessPath.replace(/\.less$/, '.css')
            overflow.css[`${temp}/${cssPath}`] = lessPath
        })

        if (module.locales) {
            var localeFiles = glob.sync(`src/modules/${module.id}/locales/*.json`)
            var localeData = {}

            localeFiles.forEach(function (localePath) {
                var id = path.basename(localePath, '.json')
                var data = JSON.parse(fs.readFileSync(localePath, 'utf8'))

                localeData[id] = data
            })

            localeData = JSON.stringify(localeData)

            mkdirp.sync(`${temp}/src/modules/${module.id}/locales`)
            fs.writeFileSync(`${temp}/src/modules/${module.id}/locales/locales.json`, localeData, 'utf8')

            module.replaces[`${module.id}_locale`] = `${temp}/src/modules/${module.id}/locales/locales.json`
        }

        var tempReplaces = {}

        for (var id in module.replaces) {
            var value = module.replaces[id]

            if (fs.existsSync(value)) {
                var ext = path.extname(value)

                if (ext === '.less') {
                    value = value.replace(/\.less$/, '.css')
                }

                // locale.json é criado diretamente dentro da pasta temporaria,
                // então é preciso especificar o caminho do mesmo para checar
                // se o arquivo existe. Então é preciso remover o caminho aqui.
                if (id === `${module.id}_locale`) {
                    value = `<%= grunt.file.read("${value}") %>`
                } else {
                    value = `<%= grunt.file.read("${temp}/${value}") %>`
                }
            }

            tempReplaces[id] = value
        }

        overflow.replaces.push({
            json: tempReplaces
        })
    })

    overflow.js.push('src/footer.js')

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            build: {
                src: overflow.js,
                dest: `${temp}/<%= pkg.name %>.js`
            }
        },
        eslint: {
            options: {
                configFile: '.eslintrc.json',
                quiet: true
            },
            build: overflow.js
        },
        less: {
            build: {
                options: {
                    compress: true,
                    ieCompat: false
                },
                files: overflow.css
            }
        },
        htmlmin: {
            build: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    ignoreCustomFragments: [/\<\#[\s\S]*?\#\>/]
                },
                files: overflow.html
            }
        },
        replace: {
            build: {
                options: {
                    prefix: '__',
                    patterns: overflow.replaces
                },
                files: [{
                    expand: true,
                    flatten: true,
                    src: [
                        `${temp}/<%= pkg.name %>.js`
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
        clean: {
            build: [temp]
        }
    })

    grunt.loadNpmTasks('grunt-eslint')
    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-less')
    grunt.loadNpmTasks('grunt-contrib-htmlmin')
    grunt.loadNpmTasks('grunt-replace')
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-copy')

    var tasks = [
        'eslint',
        'concat',
        'less',
        'htmlmin',
        'replace'
    ]

    if (grunt.option('prod')) {
        grunt.loadNpmTasks('grunt-contrib-uglify')
        tasks.push('uglify')
    }

    tasks.push('clean')

    grunt.registerTask('build', tasks)
}
