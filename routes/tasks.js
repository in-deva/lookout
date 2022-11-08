const graph = require('../graph');
const router = require('express-promise-router').default();
const { body, validationResult } = require('express-validator');
const validator = require('validator');

/* GET tasks/jobs */
router.get('/jobs',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
			try {
				const tasksJobList = await graph.getTaskJobsList(
					req.app.locals.msalClient,
					req.session.userId
				)
				console.log(tasksJobList)
				let jobs = []
				tasksJobList.value.forEach(task => {
					jobs.push({
						title: task.title,
						importance: task.importance,
						categories: task.categories,
						dateCreated: task.createdDateTime,
						customer: task.title.includes(' - ') ? task.title.split(' - ')[0] : '',
						job: task.title.includes(' - ') ? task.title.split(' - ')[1] : '',
						status: task.status.replace(/([a-z])([A-Z])/g, `$1 $2`).replace(/^\w/, c => c.toUpperCase()),
						body: task.body.content,
						other: !task.title.includes(' - ') ? task.title : '',
					})
				})
				jobs = jobs.sort(function(a, b) {
				  if(a.customer < b.customer) { return -1 }
				  if(a.customer > b.customer) { return 1 }
				  return 0
				})
				let params = { jobs	}
				res.render('tasks', params)
				}
			catch (err) {
				console.log(err)
				// req.flash('error_msg', {
				// 	message: 'Could not create event',
				// 	debug: JSON.stringify(err, Object.getOwnPropertyNames(err))
				// })
			}
		}
	}
)

module.exports = router

/* GET tasks */
// router.get('/',
//   async function(req, res) {
//     if (!req.session.userId) {
//       // Redirect unauthenticated requests to home page
//       res.redirect('/');
//     } else {
// 			try {
// 				const tasks = await graph.getAllTaskLists(
// 					req.app.locals.msalClient,
// 					req.session.userId
// 				)
// 				console.log(tasks)
// 			} catch {
// 				req.flash('error_msg', {
// 					message: 'Could not create event',
// 					debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
// 				})
// 			}
//     }
//   }
// );
