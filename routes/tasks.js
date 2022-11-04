const graph = require('../graph');
const router = require('express-promise-router').default();

/* GET tasks */
router.get('/',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
			// code here
			// add try/catch
			console.log('hello from tasks')
			const tasks = await graph.getAllTaskLists(
				req.app.locals.msalClient,
				req.session.userId
			)
			console.log(tasks)
    }
  }
);

module.exports = router;
