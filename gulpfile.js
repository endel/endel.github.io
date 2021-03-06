/*global -$ */
'use strict';
// generated on 2015-07-11 using generator-modern-frontend 0.1.7
var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var through2 = require('through2');
var browserify = require('browserify');

gulp.task('stylesheet', ['sprites'], function () {
  return gulp.src('app/css/main.styl')
    .pipe($.sourcemaps.init())
    .pipe($.stylus({
      import: ['sprites/*'], // auto-import sprite files
      errors: true
    }))
    .on('error', function (error) {
      console.log(error.stack);
      this.emit('end');
    })
    .pipe($.postcss([
      require('autoprefixer-core')({browsers: ['last 1 version']})
    ]))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/css'))
    .pipe(reload({stream: true}));
});

gulp.task('sprites', function() {
  var spritesPath = 'app/images/sprites';
  var identifiers = fs.readdirSync(spritesPath).filter(function(spritePath) {
    var stat = fs.statSync(spritesPath + '/' + spritePath);
    return stat.isDirectory();
  });

  for (var i = 0; i < identifiers.length; i++) {
    var spriteData = gulp.src(spritesPath + '/' + identifiers[i] + '/*.png').pipe($.spritesmith({
      imgName: 'sprite_' + identifiers[i] + '.png',
      cssName: identifiers[i] + '..styl',
      imgPath: '../images/sprite_' + identifiers[i] + '.png',
      cssFormat: 'stylus'
    }));

    // Pipe image stream
    spriteData.img
      .pipe(gulp.dest('.tmp/images'))
      .pipe(gulp.dest('dist/images'))

    // Pipe CSS stream
    spriteData.css
      .pipe(gulp.dest('app/css/sprites'));
  }
});

gulp.task('javascript', function () {
  return gulp.src('app/js/main.js')
    .pipe(through2.obj(function (file, enc, next){ // workaround for https://github.com/babel/babelify/issues/46
      browserify(file.path)
      .transform('babelify')
      .transform('browserify-handlebars')
      .transform('envify')
      .bundle(function(err, res){
        if (err) { return next(err); }

        file.contents = res;
        next(null, file);
      });
    }))
    .on('error', function (error) {
      console.log(error.stack);
      this.emit('end');
    })
    .pipe(gulp.dest('dist/js'))
    .pipe($.sourcemaps.init())
    // .pipe($.uglify())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('.tmp/js'));
});

gulp.task('jshint', function () {
  return gulp.src('app/js/**/*.js')
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

gulp.task('html', ['stylesheet'], function () {
  var assets = $.useref.assets({searchPath: ['.tmp', 'app/*.hbs', '.']});

  var templateData = JSON.parse( fs.readFileSync('app/data.js').toString() )
    , options = {
        ignorePartials: true, //ignores the unknown footer2 partial in the handlebars template, defaults to false
        // partials : {
        //   footer : '<footer>the end</footer>'
        // },
        batch : ['./app/partials'],
        helpers : {
          gallery_width: function(collection) {
            return (collection.length * 106) + "px";
          }
        }
      };

  // combine work + jams for modal contents
  templateData.modal_items = templateData.work.concat(templateData.jams)

  var categoriesWithGallery = [ 'work', 'jams' ];
  for (var i=0; categoriesWithGallery.length; i++) {
    if (!categoriesWithGallery.hasOwnProperty(i)) break;

    var category = categoriesWithGallery[i]
      , categoryData = templateData[ category ];

    for (var j=0; j<categoryData.length; j++) {
      var directories = fs.readdirSync("app/images/" + category);

      // categoryData
      for (var k=0; k<directories.length; k++) {
        if (directories[k].match(/^\./)) continue;
        var files = fs.readdirSync("app/images/" + category + "/" + directories[k]);

        var categoryItem = categoryData.filter(function(item) {
          return item.id == directories[k];
        })[0];

        if (!categoryItem) { console.log(category + " not found") }

        categoryItem.gallery = []

        for (var l=0; l<files.length; l++) {
          if (files[l].match(/^\./)) continue;
          categoryItem.gallery.push("images/" + category + "/" + directories[k] + "/" + files[l]);
        }

        if (categoryItem.video) {
          categoryItem.gallery.unshift(categoryItem.video);
        }

      }

    }
  }

  return gulp.src('app/*.hbs')
    .pipe(assets)
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.csso()))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.if('*.hbs', $.compileHandlebars(templateData, options)))
    .pipe($.if('*.hbs', $.rename('index.html')))
    .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))

    .pipe(gulp.dest('.tmp'))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function () {
  return gulp.src(require('main-bower-files')({
    filter: '**/*.{eot,svg,ttf,woff,woff2}'
  }).concat('app/fonts/**/*'))
    .pipe(gulp.dest('.tmp/fonts'))
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', function () {
  return gulp.src([
    'app/CNAME',
    'app/*.*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['javascript', 'html', 'fonts'], function () {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  // watch for changes
  gulp.watch([
    '.tmp/*.html',
    '.tmp/js/*.js',
    'app/images/**/*',
    '.tmp/fonts/**/*'
  ]).on('change', reload);

  gulp.watch(['app/css/**/*.styl', '!app/css/sprites/*.styl'], ['stylesheet']);
  gulp.watch('app/js/**/*.js', ['javascript']);
  gulp.watch('app/*.hbs', ['html']);
  gulp.watch('app/fonts/**/*', ['fonts']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
});

gulp.task('serve:dist', function () {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

// inject bower components
gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src('app/css/*.styl')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/css'));

  gulp.src('app/*.html')
    .pipe(wiredep({
      // exclude: ['bootstrap-sass-official'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('build', ['javascript', 'stylesheet', 'html', 'images', 'fonts', 'extras'], function () {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});

gulp.task('deploy', ['build'], function() {
  return gulp.src('dist/**/*').pipe($.ghPages({
    branch: 'master',
    remoteUrl: "https://github.com/endel/endel.github.io.git"
  }));
});
