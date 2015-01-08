var gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	rename = require('gulp-rename'),
	uglify = require('gulp-uglify'),
	notify = require('gulp-notify'),
	minifycss = require('gulp-minify-css');

gulp.task('scripts', function() {
	return gulp.src('dev/js/*.js')
		// .pipe(jshint())
		// .pipe(jshint.reporter('default'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify())
		.pipe(gulp.dest('public/js'))
		.pipe(notify({message: 'Scripts task complete!'}))
});

gulp.task('css', function() {
	return gulp.src('dev/css/*.css')
		.pipe(rename({suffix: '.min'}))
		.pipe(minifycss())
		.pipe(gulp.dest('public/css'))
		.pipe(notify({message: 'CSS task complete!'}))
});

gulp.task('watch', function() {
	gulp.watch('dev/js/*.js', ['scripts']);
	gulp.watch('dev/css/*.css', ['css']);
});