# jof

[![Greenkeeper badge](https://badges.greenkeeper.io/JamesKyburz/jof.svg)](https://greenkeeper.io/)

:zap: Just one file :zap:

For quick prototyping write server and client code in a single file

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

example

```javascript
var jof = require('jof')
jof({
  initialize: (server) => {
    // do something with http server
  },
  // browserify extra options
  browserify: [],
  routes: {
    '/' : (opt, q, r) => {
      r.end(jof.html(opt.client['/app.js']))
    }
  },
  client: {
    '/app.js' : () => {
      alert('I will be browserified')
    }
  }
})
```
