"use strict";

import { src, dest, watch, parallel, series } from "gulp";
import gulpif from "gulp-if";
import browsersync from "browser-sync";
import autoprefixer from "gulp-autoprefixer";
import babel from "gulp-babel";
import browserify from "browserify";
import watchify from "watchify";
import source from "vinyl-source-stream";
import buffer from "vinyl-buffer";
import uglify from "gulp-uglify";
import pug from "gulp-pug";
import sass from "gulp-sass";
import mincss from "gulp-clean-css";
import sourcemaps from "gulp-sourcemaps";
import rename from "gulp-rename";
import imagemin from "gulp-imagemin";
import imageminPngquant from "imagemin-pngquant";
import imageminZopfli from "imagemin-zopfli";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminGiflossy from "imagemin-giflossy";
import favicons from "gulp-favicons";
import svgSprite from "gulp-svg-sprite";
import replace from "gulp-replace";
import plumber from "gulp-plumber";
import debug from "gulp-debug";
import clean from "gulp-clean";
import yargs from "yargs";

const argv = yargs.argv;
const production = !!argv.production;

const paths = {
	src: {
		pug: [
			"./src/views/**/*.pug",
			"!./src/views/utils/**/*.pug"
		],
		styles: "./src/styles/**/*.scss",
		images: [
			"./src/img/**/*.{jpg,jpeg,png,gif,svg}",
			"!./src/img/svg/*.svg"
		],
		sprites: "./src/img/svg/*.svg",
		server_config: "./src/.htaccess"
	},
	build: {
		clean: ["./dist/*", "./dist/.*"],
		general: "./dist/",
		styles: "./dist/styles/",
		images: "./dist/img/",
		sprites: "./dist/img/sprites/"
	}
};


export const server = () => {
	browsersync.init({
		server: paths.build.general,
		port: 9000,
		tunnel: true,
		notify: false
	});
};

export const watchCode = () => {
	watch(paths.src.pug, pugToHTML);
	watch(paths.src.styles, styles);
	watch(paths.src.images, images);
	watch(paths.src.sprites, sprites);
};

export const cleanFiles = () => src(paths.build.clean, {read: false})
	.pipe(clean())
	.pipe(debug({
		"title": "Cleaning..."
	}));

export const serverConfig = () => src(paths.src.server_config)
	.pipe(dest(paths.build.general))
	.pipe(debug({
		"title": "Server config"
	}));

export const pugToHTML = () => src(paths.src.pug)
	.pipe(pug({pretty: true}))
	.pipe(gulpif(production, replace("main.css", "main.min.css")))
	.pipe(gulpif(production, replace("main.js", "main.min.js")))
	.pipe(dest(paths.build.general))
	.on("end", browsersync.reload);

export const styles = () => src(paths.src.styles)
	.pipe(plumber())
	.pipe(gulpif(!production, sourcemaps.init()))
	.pipe(sass())
	.pipe(gulpif(production, autoprefixer({
		browsers: ["last 12 versions", "> 1%", "ie 8", "ie 7"]
	})))
	.pipe(gulpif(production, mincss({
		compatibility: "ie8", level: {
			1: {
				specialComments: 0,
				removeEmpty: true,
				removeWhitespace: true
			},
			2: {
				mergeMedia: true,
				removeEmpty: true,
				removeDuplicateFontRules: true,
				removeDuplicateMediaBlocks: true,
				removeDuplicateRules: true,
				removeUnusedAtRules: false
			}
		}
	})))
	.pipe(gulpif(production, rename({
		suffix: ".min"
	})))
	.pipe(plumber.stop())
	.pipe(gulpif(!production, sourcemaps.write("./maps/")))
	.pipe(dest(paths.build.styles))
	.pipe(debug({
		"title": "CSS files"
	}))
	.on("end", browsersync.reload);

export const images = () => src(paths.src.images)
	.pipe(gulpif(production, imagemin([
		imageminGiflossy({
			optimizationLevel: 3,
			optimize: 3,
			lossy: 2
		}),
		imageminPngquant({
			speed: 5,
			quality: 75
		}),
		imageminZopfli({
			more: true
		}),
		imageminMozjpeg({
			progressive: true,
			quality: 70
		}),
		imagemin.svgo({
			plugins: [
				{ removeViewBox: false },
				{ removeUnusedNS: false },
				{ removeUselessStrokeAndFill: false },
				{ cleanupIDs: false },
				{ removeComments: true },
				{ removeEmptyAttrs: true },
				{ removeEmptyText: true },
				{ collapseGroups: true }
			]
		})
	])))
	.pipe(dest(paths.build.images))
	.pipe(debug({
		"title": "Images"
	}))
	.on("end", browsersync.reload);

export const sprites = () => src(paths.src.sprites)
	.pipe(svgSprite({
		mode: {
			stack: {
				sprite: "../sprite.svg"
			}
		}
	}))
	.pipe(dest(paths.build.sprites))
	.pipe(debug({
		"title": "Sprites"
	}))
	.on("end", browsersync.reload);

export const development = series(cleanFiles, sprites, parallel(pugToHTML, styles, images),
	parallel(watchCode, server));

export const prod = series(cleanFiles, sprites, serverConfig, pugToHTML, styles, images);

export default development;