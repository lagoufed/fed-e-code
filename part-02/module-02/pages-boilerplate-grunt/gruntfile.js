const grunt = require('grunt')
const path = require('path')
const sass = require('node-sass')
const ghpages = require('gh-pages')

// hack useref 引入了 grunt-css
const loadNpmTasks = grunt.loadNpmTasks
grunt.loadNpmTasks = function () {
  const args = [].slice.call(arguments)
  const task = args[0] || ''
  if (typeof task !== 'string') {
    loadNpmTasks.apply(grunt, args)
    return
  }
  if (task.indexOf('grunt-css') === -1) {
    loadNpmTasks.apply(grunt, args)
    return
  }
}

module.exports = function () {
  require('load-grunt-tasks')(grunt)

  const isProduction = grunt.option('production') || grunt.option('prod')
  const port = grunt.option('port') || 2080
  const openBrowser = grunt.option('open') || false
  const env = isProduction ? 'production' : 'development'

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['src/**/*.js'],
        tasks: ['eslint', 'babel'],
      },
      css: {
        files: ['src/**/*.scss'],
        tasks: ['stylelint', 'sass'],
      },
      html: {
        files: ['src/**/*.html'],
        tasks: ['swig:dist'],
      },
    },
    clean: {
      all: ['temp', 'dist'],
      temp: ['temp'],
    },
    stylelint: {
      options: {
        configFile: '.stylelintrc.json',
        failOnError: true,
        syntax: 'scss',
      },
      src: ['src/**/*.scss'],
    },
    eslint: {
      options: {},
      production: {
        src: [],
      },
      development: {
        src: ['src/**/*.js'],
      },
    },
    swig: {
      dist: {
        init: { autoescape: true },
        ext: '.html',
        dest: 'temp/',
        src: ['src/**/*.html'],
        production: false,
      },
    },
    sass: {
      options: {
        implementation: sass,
        sourceMap: !isProduction,
        outputStyle: 'expanded',
      },
      dist: {
        files: [
          {
            expand: true,
            src: ['**/*.scss'],
            dest: 'temp/',
            cwd: 'src/',
            ext: '.css',
          },
        ],
      },
    },
    babel: {
      options: {
        sourceMap: !isProduction,
        presets: ['@babel/preset-env'],
      },
      dist: {
        files: [
          {
            cwd: 'src/',
            expand: true,
            src: ['**/*.js'],
            dest: 'temp/',
          },
        ],
      },
    },
    copy: {
      dist: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['assets/fonts/**'],
            dest: 'dist/',
          },
          {
            expand: true,
            cwd: 'src/',
            src: ['assets/images/**'],
            dest: 'dist/',
          },
        ],
      },
    },
    browserSync: {
      dist: {
        bsFiles: {
          src: ['temp/**/*'],
        },

        options: {
          watchTask: true,
          port,
          open: openBrowser,
          server: {
            baseDir: './temp',
            routes: {
              '/assets/fonts': 'dist/assets/fonts',
              '/assets/images': 'dist/assets/images',
              '/node_modules': 'node_modules',
            },
          },
          // index: 'index.html',
        },
      },
    },
    cssmin: {
      development: {
        options: {
          format: 'beautify',
        },
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: ['**/*.css'],
            dest: 'dist',
            ext: '.css',
          },
        ],
      },
      production: {
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: ['**/*.css'],
            dest: 'dist',
            ext: '.css',
          },
        ],
      },
    },
    htmlmin: {
      development: {
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: '**/*.html',
            dest: 'dist',
            ext: '.html',
          },
        ],
      },
      production: {
        options: {
          collapseWhitespace: isProduction,
          minifyCSS: isProduction,
          minifyJS: isProduction,
        },
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: '**/*.html',
            dest: 'dist',
            ext: '.html',
          },
        ],
      },
    },
    uglify: {
      development: {
        options: { beautify: true },
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: ['**/*.js'],
            dest: 'dist',
            ext: '.js',
          },
        ],
      },
      production: {
        files: [
          {
            expand: true,
            cwd: 'temp/',
            src: ['**/*.js'],
            dest: 'dist',
            ext: '.js',
          },
        ],
      },
    },
    useref: {
      html: 'temp/**/*.html',
      temp: 'temp',
    },
    imagemin: {
      dist: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.{png,jpg,gif,svg}'],
            dest: 'dist/',
          },
        ],
      },
    },
    'gh-pages': {
      options: {
        base: 'dist',
      },
      src: ['**'],
    },
  })

  grunt.registerTask('lint', ['stylelint', 'eslint'])

  grunt.registerTask('compile', ['swig', 'sass', 'babel'])

  grunt.registerTask('serve', ['compile', 'copy', 'browserSync', 'watch'])

  // hack useref 配置的 concat plugin 问题
  grunt.registerTask('hack_useref', function () {
    const concatConfig = grunt.config('concat')
    function replaceNodeModules() {
      return Reflect.ownKeys(concatConfig).reduce((p, c) => {
        const currentValue = concatConfig[c]
        const nextValue = currentValue.map((v) =>
          v.includes('node_modules') ? v.replace('temp/', '') : v
        )
        return { ...p, [c]: nextValue }
      }, {})
    }
    grunt.config('concat', replaceNodeModules())
  })

  grunt.registerTask('build', [
    'clean:all',
    'compile',
    'copy',
    'useref',
    'hack_useref',
    'concat',
    'htmlmin:' + env,
    'cssmin:' + env,
    'uglify:' + env,
    'clean:temp',
  ])

  grunt.registerTask('start', [
    'clean:all',
    'compile',
    'imagemin',
    'useref',
    'hack_useref',
    'concat',
    'htmlmin:production',
    'cssmin:production',
    'uglify:production',
    // "bs",
    'clean:temp',
  ])

  grunt.registerTask('gh-pages', function () {
    const done = this.async()
    ghpages.publish(path.join(__dirname, 'dist'), function (err) {
      done(err)
    })
  })

  grunt.registerTask('deploy', ['build', 'gh-pages'])
}
