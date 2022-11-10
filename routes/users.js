var express = require('express')
var router = express.Router()

// what is the purpose of this? delete?

router.get('/', function(req, res) {
  res.send('respond with a resource')
})

module.exports = router
