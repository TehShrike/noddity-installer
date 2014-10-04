#!/usr/local/bin/node

var path = require('path')
var browserify = require('browserify')
var npm = require('npm')
var uglify = require('uglify-js')
var fs = require('fs')
var fsSync = require('fs-sync')

var cwd = process.cwd()

installAndBuild(cwd, function(err) {
	if (err) {
		console.log(err)
	} else {
		var noddityDirectory = path.join(cwd, 'node_modules', 'noddity')
		var easyCopy = copy.bind(null, noddityDirectory, cwd)

		easyCopy('content/404.md')

		easyCopy('js/build.js')
		easyCopy('js/vendor/satnav.js')

		easyCopy('icon')
		easyCopy('font')

		easyCopy('.htaccess')
		easyCopy('config.js')
		easyCopy('index.html')
		easyCopy('logo.svg')
		easyCopy('style.css')

		var indexJsonFile = path.join(cwd, 'content', 'index.json')
		if (!fs.existsSync(indexJsonFile)) {
			fs.writeFileSync(indexJsonFile, '[]')
		}
		var indexMdFile = path.join(cwd, 'content', 'index.md')
		if (!fs.existsSync(indexMdFile)) {
			fs.writeFileSync(indexMdFile, 'Welcome!\n==========\n\nGo edit this markdown file and make this site your own.')
		}

		console.log("** npm uninstall noddity")
		npm.prefix = cwd
		npm.commands.uninstall(['noddity'], function() {
			try {
				fs.rmdirSync(path.join(cwd, 'node_modules'))
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
			var b = browserify(path.join(noddityDirectory, 'js', 'index.js'))
			b.bundle({ detectGlobals: true }, function(err, code) {
				if (err) {
					next(err)
				} else {
					minify(code)
				}
			})
		}

		function minify(code) {
			console.log("** Minifying")
			var smallerCode = uglify.minify(code, {
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
