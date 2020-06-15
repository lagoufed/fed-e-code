// 实现这个项目的构建任务
const gulp = require('gulp')
const gulpClean = require('gulp-clean')
const { program } = require('commander')
const stylelint = require('gulp-stylelint')
const eslint = require('gulp-eslint')
const swig = require('gulp-swig')
const babel = require('gulp-babel')
const sass = require('gulp-sass')
const useref = require('gulp-useref')
const terser = require('gulp-terser')
const gif = require('gulp-if')
const htmlmin = require('gulp-htmlmin')
const ghPages = require('gulp-gh-pages')
const bs = require('browser-sync').create()

program
  .option('-p, --port [value]', 'Specify service port', 2080)
  .option('-o, --open', 'Open a browser', false)
  .option('-P, --production', 'Production mode', false)
  .option('--prod', 'Production mode alias', false)
  // eslint-disable-next-line no-undef
  .parse(process.argv)

function isProduction() {
  return program.production || program.prod
}

function condition(extname) {
  return function (file) {
    return file.extname === extname && isProduction()
  }
}

const compile = {
  html: function () {
    return gulp
      .src('src/*.html')
      .pipe(swig({ defaults: { cache: isProduction() } }))
      .pipe(useref({ searchPath: ['.src', '.'] }))
      .pipe(gif(condition('.js'), terser()))
      .pipe(
        gif(
          condition('.html'),
          htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
          })
        )
      )
      .pipe(gulp.dest('dist/'))
  },
  style: function () {
    return gulp
      .src('src/**/*.scss')
      .pipe(sass({ outputStyle: isProduction() ? 'compressed' : 'expanded' }))
      .pipe(gulp.dest('dist/'))
      .pipe(bs.stream())
  },
  script: function () {
    return gulp
      .src('src/**/*.js')
      .pipe(babel({ presets: ['@babel/env'] }))
      .pipe(gif(isProduction, terser()))
      .pipe(gulp.dest('dist/'))
  }
}

/**
 * 复制 public 底下的文件到 dist
 */
function copy() {
  return gulp.src('public/**/*').pipe(gulp.dest('dist'))
}

function setProduction(done) {
  program.prod = true
  done()
}

/**
 * 删除 temp 和 dist 目录
 */
exports.clean = function () {
  return gulp.src(['temp', 'dist'], { allowEmpty: true }).pipe(gulpClean())
}

/**
 * 校验：
 * 使用 stylelint 和 eslint 校验 scss 与 javascript
 * Lint the styles & scripts files.
 */
exports.lint = gulp.parallel([
  function () {
    return gulp.src(['src/**/*.js']).pipe(eslint()).pipe(eslint.failOnError())
  },
  function () {
    return gulp.src(['src/**/*.scss']).pipe(
      stylelint({
        syntax: 'scss',
        reporters: [{ formatter: 'string', console: true }]
      })
    )
  }
])

/**
 * 编译：
 * 使用 swig, babel, sass 编译
 * Compile the styles & scripts & pages file.
 */
exports.compile = gulp.parallel([compile.html, compile.style, compile.script])

/**
 * 启动一个 http 服务器
 * Runs the app in development mode with a automated server.
 */
exports.serve = gulp.series([
  copy,
  exports.compile,
  function () {
    bs.init({ server: './dist', port: program.port, open: program.open })

    if (isProduction()) return

    gulp.watch('src/**/*.html', compile.html)
    gulp.watch('src/**/*.scss', compile.style)
    gulp.watch('src/**/*.js', compile.script)
    gulp.watch(['dist/**/*.html', 'dist/**/*.js']).on('change', bs.reload)
  }
])

/**
 * 构建项目
 * Builds the app for production to the `dist` folder. It minify source in production mode for the best performance.
 */
exports.build = gulp.series([copy, exports.compile])

/**
 * 构建项目
 * Builds the app for production to the `dist` folder. It minify source in production mode for the best performance.
 */
exports.start = gulp.series([
  copy,
  setProduction,
  exports.compile,
  exports.serve
])

exports.deploy = gulp.series([
  exports.build,
  function () {
    return gulp.src('dist/**/*').pipe(ghPages())
  }
])
