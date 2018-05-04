const gulp = require('gulp');
const browserify = require('browserify');
const watchify = require('watchify');
const errorify = require('errorify');
const del = require('del');
const tsify = require('tsify');
const gulpTypings = require('gulp-typings');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');
const fs = require("fs");
const commonShake = require('common-shakeify');

function createBrowserifier(entry) {
	return browserify({
		basedir: '.',
		debug: true,
		entries: [entry],
		cache: {},
		packageCache: {}
	})
		.plugin(tsify)
		.plugin(watchify)
		.plugin(errorify)
		.plugin(commonShake);
}

function bundle(browserifier, bundleName, destination) {
	return browserifier
		.bundle()
		.pipe(source(bundleName))
		.pipe(gulp.dest(destination));
}

function bundleFiles(fileNames) {
	return Promise.all(
		fileNames.map(fileName =>
			bundle(
				createBrowserifier(`./ts/entries/${fileName}.ts`),
				`${fileName}.js`,
				'js'
			)
		)
	);
}

gulp.task('clean', () => {
	return del('./js/**/*');
});

gulp.task('installTypings', () => {
	return gulp.src('typings.json').pipe(gulpTypings());
});

gulp.task('tsc-browserify-src', () => {
	return bundle(
		createBrowserifier('./ts/entries/test.ts'),
		'test.js',
		'js');
});

gulp.task('bundle-all-entries', () => {
	return bundleFiles(fs.readdirSync('./ts/entries').filter(name => name.endsWith('.ts')).map(name => name.substr(0, name.length - 3)));
});

gulp.task('default', (done) => {
	runSequence(['clean', 'installTypings'], 'bundle-all-entries', () => {
		console.log('Watching...')
		gulp.watch(['ts/**/*.ts'],
			['bundle-all-entries']);
	});
});