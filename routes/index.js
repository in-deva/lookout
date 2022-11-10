var express = require('express')
var router = express.Router()

router.get('/', function(req, res) {
  let params = {
    active: { home: true }
  }
  res.render('index', params)
})

module.exports = router
