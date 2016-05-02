var http = require('http')
var spawn = require('cross-spawn')
var concat = require('concat-stream')
var hash = require('http-hash')
var routes = hash()
var server = http.createServer()
var port = process.env.PORT || 1234

module.exports = jof

function jof (opt) {
  if (typeof opt.initialize === 'function') opt.initialize(server)
  var registeredRoutes
  opt.client = opt.client || []
  opt.routes = opt.routes || []
  server.on('request', (q, r) => {
    var pending = Object.keys(opt.client).length
    if (!pending) return done()
    Object.keys(opt.client).forEach((url) => {
      if (typeof opt.client[url] === 'string') return done()
      var ps = spawn('browserify', ['-'].concat(opt.browserify || []))
      var js = opt.client[url].toString().split('\n').slice(1, -1).join('\n')
      ps.stdin.write(js)
      ps.stdin.end()
      ps.stdout.pipe(concat((js) => {
        opt.client[url] = js.toString()
        done()
      }))
    })
    function done () {
      if (!registeredRoutes && --pending) {
        Object.keys(opt.routes).forEach((url) => routes.set(url, opt.routes[url]))
        registeredRoutes = true
      }
      if (registeredRoutes) {
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
  })
}

jof.html = html

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
