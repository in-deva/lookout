const graph = require('../graph');
const router = require('express-promise-router').default();

// both currently unused (get jobs route changed to function in calendar)

/* GET tasks */
router.get('/',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
			try {
				const tasks = await graph.getAllTaskLists(
					req.app.locals.msalClient,
					req.session.userId
				)
				console.log(tasks)
			} catch {
				req.flash('error_msg', {
					message: 'Could not create event',
					debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
				})
			}
    }
  }
);

/* GET tasks/jobs */
router.get('/jobs',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
			try {
				const tasks = await graph.getTaskJobsList(
					req.app.locals.msalClient,
					req.session.userId
				)
				console.log('hello from /tasks/jobs');
				let jobs = []
				tasks.value.forEach(task => {
					jobs.push({
						title: task.title,
						status: task.status,
						categories: task.categories,
						body: task.body
					})
				})
				res.send(jobs)
				}
			catch (error) {
				req.flash('error_msg', {
					message: 'Could not create event',
					debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
				})
			}
		}
	}
)

module.exports = router;
