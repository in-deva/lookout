const graph = require('../graph')
const router = require('express-promise-router').default()
const { body, validationResult } = require('express-validator')
const validator = require('validator')

router.get('/',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/')
    } else {
			try {
				res.render('docs')
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
