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
      var ps = spawn('browserify', ['-'].concat(opt.browserify || []))
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
