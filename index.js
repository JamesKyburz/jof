var http = require('http')
var spawn = require('cross-spawn')
var concat = require('concat-stream')
var server = http.createServer()
var port = process.env.PORT || 1234

module.exports = jof

function jof (opt) {
  opt.server = server
  server.on('request', (q, r) => {
    var pending = Object.keys(opt.client).length
    Object.keys(opt.client).forEach((url) => {
      if (typeof opt.client[url] === 'string') return bundled()
      var ps = spawn('browserify', ['-'].concat(opt.browserify || []))
      var js = opt.client[url].toString().split('\n').slice(1, -1).join('\n')
      ps.stdin.write(js)
      ps.stdin.end()
      ps.stdout.pipe(concat((js) => {
        opt.client[url] = js.toString()
        bundled()
      }))
    })
    function bundled () {
      if (!--pending) {
        var match = false
        Object.keys(opt.routes).forEach((url) => {
          if (match) return
          if (q.url === url) {
            r.setHeader('content-type', 'text/html')
            opt.routes[url](opt, q, r)
            match = true
          }
        })
        if (!match) {
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
