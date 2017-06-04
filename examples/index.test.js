const path = require('path')
const parse = require('../dist/index.js')
parse({
  src: path.join(__dirname, './test.js'),
  dist: path.join(__dirname, './static')
})
