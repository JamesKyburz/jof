var fs = require('fs')
var parentFile = module.parent.filename
var spawn = require('cross-spawn')
var check = require('syntax-error')
var path = require('path')
var http = require('http')
var concat = require('concat-stream')
var hash = require('http-hash')
var port = process.env.PORT || 1234
var browserify = require('bin-path')(require)('browserify').browserify
var server = http.createServer()

fs.watchFile(parentFile, rerun)
setupOnCrash()

function rerun () {
  console.log('changed detected, running again')
  Object.keys(require.cache).forEach((key) => {
    if (key !== __filename) {
      delete require.cache[key]
    }
  })
  server.removeAllListeners('request')
  fs.readFile(parentFile, 'utf-8', (_, data) => {
    console.log('checking syntax %s', parentFile)
    var error = check(data, parentFile)
    if (error) {
      console.error(error)
      server.on('request', (q, r) => r.end(error.toString()))
    } else {
      console.log('syntax ok')
      require(parentFile)
    }
  })
}

function installMissing (cb) {
  var ps = spawn('dependency-sync', [path.basename(parentFile), '--once', '--debug'], { stdio: 'inherit', cwd: process.cwd() })
  ps.on('exit', cb)
}

function setupOnCrash () {
  process.removeListener('uncaughtException', uncaughtException)
  process.on('uncaughtException', uncaughtException)
}

function uncaughtException (err) {
  server.removeAllListeners('request')
  console.error(err)
  server.on('request', (q, r) => r.end(err.toString()))
  setTimeout(rerun, 2000)
}

module.exports = (opt) => {
  server.removeAllListeners('request')
  server.on('request', (q, r) => r.end('checking dependencies'))
  installMissing(() => {
    server.removeAllListeners('request')
    jof(opt)
  })
}

module.exports.html = html

function jof (opt) {
  var routes = hash()
  if (typeof opt.initialize === 'function') opt.initialize(server)
  server.on('request', onRequest)
  var queue = []
  var ready
  opt.client = opt.client || []
  opt.routes = opt.routes || []
  Object.keys(opt.routes).forEach((url) => routes.set(url, opt.routes[url]))
  var pending = Object.keys(opt.client).length
  if (!pending) {
    done()
  } else {
    Object.keys(opt.client).forEach((url) => {
      var ps = spawn(browserify, ['-'].concat(opt.browserify || []))
      var js = opt.client[url].toString().split('\n').slice(1, -1).join('\n')
      ps.stdin.write(js)
      ps.stdin.end()
      ps.stdout.pipe(concat((js) => {
        opt.client[url] = js.toString()
        pending--
        if (!pending) done()
      }))
    })
  }

  function done () {
    ready = true
    queue.forEach((item) => onRequest(item[0], item[1]))
  }

  function onRequest (q, r) {
    if (!ready) return queue.push([q, r])
    var match = routes.get(q.url)
    if (match.handler) {
      r.setHeader('content-type', 'text/html')
      match.handler(opt, q, r, match.params, match.splat)
    } else {
      r.writeHead(404)
      r.end()
    }
  }
}

function html (js) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>jof</title>
</head>
<body>
  <script>${js}</script>
</body>
</html>
`
}
server.listen(port, console.log.bind(console, 'open http://localhost:%s', port))
