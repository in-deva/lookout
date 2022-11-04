const graph = require('../graph');
const router = require('express-promise-router').default();

/* GET tasks */
router.get('/',
  function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
			// code here
			console.log('hello from tasks')
    }
  }
);

module.exports = router;
