#!/usr/bin/env node

var path = require('path')
var browserify = require('browserify')
var npm = require('npm')
var uglify = require('uglify-js')
var fs = require('fs')
var fsSync = require('fs-sync')

var cwd = process.cwd()

installAndBuild(cwd, function(err) {
	var joinToCwd = path.join.bind(path, cwd)
	if (err) {
		console.log(err)
	} else {
		var noddityDirectory = joinToCwd('node_modules', 'noddity')
		var easyCopy = copy.bind(null, noddityDirectory, cwd)

		function createIfNotExists(name, content) {
			var path = joinToCwd('content', name)
			if (!fs.existsSync(path)) {
				fs.writeFileSync(path, content)
			}
		}

		[
			'content/404.md',

			'js/build.js',
			'js/vendor/satnav.js',

			'icon',
			'font',

			'.htaccess',
			'config.js',
			'index.html',
			'logo.svg',
			'style.css',
			'fonts.css'
		].forEach(easyCopy)

		createIfNotExists('index.json', '[]')
		createIfNotExists('index.md', 'title: Welcome!\n\nGo edit this markdown file and make this site your own.')

		console.log("** npm uninstall noddity")
		npm.prefix = cwd
		npm.commands.uninstall(['noddity'], function() {
			try {
				fs.rmdirSync(joinToCwd('node_modules'))
			} catch (e) {
				// Apparently when this is run from a global module, sometimes uninstalling also removes the node_module directory for you?
			}
		})
	}
})

function installAndBuild(installDirectory, next) {
	console.log("** npm installing noddity to", installDirectory)
	var jsDirectory = path.join(installDirectory, 'js')
	try {
		fs.mkdirSync(jsDirectory)
	} catch (e) {
		// whatever
	}
	var buildFile = path.join(jsDirectory, 'build.js')

	if (fs.existsSync(buildFile)) {
		next(new Error("build.js already exists there"))
	} else {
		//npm.dir = installDirectory
		npm.load({}, function(err) {
			if (err) {
				next(err)
			} else {
				npm.commands.install(installDirectory, ['noddity'], function(err, data) {
					if (err) {
						next(err)
					} else {
						var noddityDirectory = path.join(installDirectory, 'node_modules', 'noddity')
						build(noddityDirectory)
					}
				})

			}
		})

		function build(noddityDirectory) {
			console.log("** Building with Browserify")
			var b = browserify(path.join(noddityDirectory, 'js', 'index.js'), { detectGlobals: true })
			b.bundle(function(err, code) {
				if (err) {
					next(err)
				} else {
					minify(code)
				}
			})
		}

		function minify(code) {
			console.log("** Minifying")
			var smallerCode = uglify.minify(code.toString(), {
				fromString: true,
				output: {
					semicolons: false
				}
			}).code
			fs.writeFileSync(buildFile, smallerCode)
			next()
		}
	}
}

function copy(sourceDirectory, destinationDirectory, file) {
	console.log("** Copying", file, "from", sourceDirectory, "to", destinationDirectory)
	var source = path.join(sourceDirectory, file)
	var destination = path.join(destinationDirectory, file)
	fsSync.copy(source, destination)
}
