// ===== ИМПОРТЫ =====
const {
    src,
    dest,
    parallel,
    series,
    watch
} = require('gulp');
const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer').default;
const scss = require('gulp-sass')(require('sass'));
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const del = require('del'); // ✅ Исправлено для del@6
const fs = require('fs');
const path = require('path');
const rename = require('gulp-rename');

// ===== BROWSERSYNC =====
function browsersync() {
    browserSync.init({
        server: {
            baseDir: 'app/'
        },
        notify: false,
        online: true
    });
}

// ===== СКРИПТЫ =====
function scripts() {
    return src('app/js/main.js', {
            allowEmpty: true
        })
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(dest('app/js'))
        .pipe(browserSync.stream());
}

// ===== СТИЛИ =====
function styles() {
    return src('app/scss/style.scss', {
            allowEmpty: true
        })
        .pipe(scss({
            outputStyle: 'expanded'
        }))
        .pipe(concat('style.min.css'))
        .pipe(autoprefixer({
            overrideBrowserslist: ['last 10 versions'],
            grid: true
        }))
        .pipe(dest('app/css'))
        .pipe(browserSync.stream());
}

// ===== ИЗОБРАЖЕНИЯ =====
function images() {
    if (!fs.existsSync('app/images')) {
        return Promise.resolve();
    }
    return src('app/images/**/*.{jpg,jpeg,png,gif,svg}', {
            allowEmpty: true,
            encoding: false // ✅ Важно: отключаем кодировку для бинарных файлов
        })
        .pipe(imagemin([
            imagemin.gifsicle({ interlaced: true }),
            
            // ✅ mozjpeg: оборачиваем в try-catch, чтобы ошибка не ломала весь пайплайн
            (() => {
                try {
                    return imagemin.mozjpeg({ quality: 75, progressive: true });
                } catch (e) {
                    console.warn('⚠️ mozjpeg не загружен, пропускаем...');
                    return plugin => plugin; // Пустой плагин-заглушка
                }
            })(),
            
            imagemin.optipng({ optimizationLevel: 5 }),
            
            // ✅ SVGO: НОВЫЙ синтаксис для gulp-imagemin@7+
            imagemin.svgo({
                plugins: [
                    { name: 'removeViewBox', active: false },
                    { name: 'cleanupIDs', params: { minify: false } },
                    { name: 'removeComments', active: true }
                ]
            })
        ]))
        .on('error', (err) => {
            console.error('❌ Ошибка оптимизации:', err.message);
        })
        .pipe(dest('dist/images'));
}

// ===== WATCH =====
function watching() {
    watch(['app/**/*.html']).on('change', browserSync.reload);
    watch(['app/js/**/*.js', '!app/js/main.min.js'], scripts);
    watch(['app/scss/**/*.scss'], styles);
}

// ===== ОЧИСТКА dist =====
function cleandist() {
    return del('dist'); // ✅ Исправлено: del вместо deleteAsync
}

// ===== ОЧИСТКА APP (Исходников) =====
function cleanApp() {
    return del([ // ✅ Исправлено: del вместо deleteAsync
        'app',
        'dist'
    ]);
}

// ===== СОЗДАНИЕ ИСХОДНИКОВ =====
function createSource() {
    // 1. Создаём папки
    const folders = ['app', 'app/css', 'app/js', 'app/scss', 'app/scss/components', 'app/images'];
    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {
                recursive: true
            });
        }
    });

    // 2. Создаём файлы-заглушки
    const files = {
        'app/index.html': `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/style.css">
    <title>Document</title>
</head>

<body>


    <script src="js/main.js"></script>
</body>

</html>`,
        'app/scss/style.scss': `@import 'components/style';
@import 'components/main';
@import 'components/header';
@import 'components/footer';`,
        'app/js/main.js': `document.addEventListener('DOMContentLoaded', () => {
    
})`,
        'app/scss/components/_style.scss': `@function rem($pixels) {
    @return calc($pixels/10)+rem;
}

html {
    font-size: calc(100vw/1920 * 10);
    box-sizing: border-box;
    scroll-behavior: smooth;
    overflow-x: hidden;
}

*,
*::before,
*::after {
    box-sizing: inherit;
}

body,
h1,
h2,
h3,
h4,
h5,
h6,
p,
ul,
ol,
li,
figure,
figcaption,
blockquote,
dl,
dd {
    margin: 0;
    padding: 0;
}

ul {
    list-style: none;
}

img {
    max-width: 100%;
    display: block;
}

a {
    text-decoration: none;
    color: inherit;
}

input,
button,
textarea,
select {
    font: inherit;
}

button {
    border: none;
    background-color: transparent;
    padding: 0;
    cursor: pointer;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    border: 0;
    padding: 0;
    white-space: nowrap;
    clip-path: inset(100%);
    clip: rect(0 0 0 0);
    overflow: hidden;
}`,
        'app/scss/components/_mixin.scss': `@mixin backgroundProps($repeat, $position, $size) {
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
}`,
'app/scss/components/_main.scss': ``,
'app/scss/components/_header.scss': ``,
'app/scss/components/_footer.scss': ``
    };

    // 3. Запись файлов
    Object.entries(files).forEach(([filePath, content]) => {
        fs.writeFileSync(filePath, content, 'utf8');
    });

    console.log('✅ Исходники созданы!');
    return Promise.resolve();
}

// ===== BUILD =====
function buildFiles() {
    return src([
            'app/**/*.html',
            'app/css/style.min.css',
            'app/js/main.min.js'
        ], {
            base: 'app',
            allowEmpty: true
        })
        .pipe(rename(function (path) {
            // Убираем ".min" из имени файла
            path.basename = path.basename.replace('.min', '');
        }))
        .pipe(dest('dist'));
}

// ===== ЭКСПОРТ =====
exports.browsersync = browsersync;
exports.scripts = scripts;
exports.styles = styles;
exports.images = images;
exports.watching = watching;
exports.cleandist = cleandist;
exports.cleanApp = cleanApp;
exports.createSource = createSource;
exports.buildFiles = buildFiles;

// ✅ Сборка проекта
exports.build = series(cleandist, parallel(styles, scripts), images, buildFiles);

// ✅ Инициализация: очистка app → создание структуры → сборка
exports.init = series(cleanApp, createSource);

// ✅ Default: старт разработки
exports.default = parallel(styles, scripts, browsersync, watching);