const router = require('express-promise-router').default();
const graph = require('../graph.js');
const { body, validationResult } = require('express-validator');
const validator = require('validator');
const dayjs = require('dayjs')
dayjs().format()

// GET /calendar
router.get('/',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
      const params = {
        active: { calendar: true }
      }
      try {
        // Get the events
        const events = await graph.getCalendarView(
          req.app.locals.msalClient,
          req.session.userId,
					dayjs(new Date(2022, 1, 1, 0, 0, 0)), // hardcoded start date
          dayjs(new Date(2023, 1, 1, 0, 0, 0)), // hardcoded end date
				)

				// Processing events.value
				let subjects = []
				let categories = []
				events.value.forEach((item, i) => {
					subjects.push(item.subject)
					item.customer = item.subject.split(' - ')[0]
					item.job = item.subject.split(' - ')[1]
					categories = [...new Set(categories.concat(item.categories))].sort()
					item.duration = Number(dayjs(item.end.dateTime).diff(dayjs(item.start.dateTime), 'hour', true).toFixed(1))
					item.start.dateFormatted = String(dayjs(item.start.dateTime).format('DD/MM/YYYY HH:mm'))
					item.end.dateFormatted = String(dayjs(item.end.dateTime).format('DD/MM/YYYY HH:mm'))
				})

				// Filters - pulling unique subjects and categories from ALL events
				subjects = [...new Set(subjects)].filter(title => title.includes('-')) // filtered to only those with a '-'
				const customers = [...new Set(subjects.map(subject => subject.split(' - ')[0]))].sort()
				const jobs = [...new Set(subjects.map(subject => subject.split(' - ')[1]))].sort()

				// processing filters from the query (if exists)
					// note: categories ADDs to the filters, not checks if all filters are met by an events categories
				if (Object.entries(req.query).length) {
					let evFilterCategories = []
					let evFilterCustomers = []
					let evFilterJobs = []
					typeof req.query.categories == 'string' ? req.query.categories = [req.query.categories] : null
					typeof req.query.customers == 'string' ? req.query.customers = [req.query.customers] : null
					typeof req.query.jobs == 'string' ? req.query.jobs = [req.query.jobs] : null
					events.value.forEach(ev => {
						if (req.query.customers && req.query.customers.includes(ev.customer)) {evFilterCustomers.push(ev)}
						if (req.query.jobs && req.query.jobs.includes(ev.job)) {evFilterJobs.push(ev)}
						ev.categories.forEach(category => {
							if (req.query.categories && req.query.categories.includes(category)) {evFilterCategories.push(ev)}
						})
					})
					evFilterCategories = [...new Set(evFilterCategories)]
					evFilterCustomers = [...new Set(evFilterCustomers)]
					evFilterJobs = [...new Set(evFilterJobs)]
					// Filtering params.events according to selection
					let evFiltered = events.value
					if (req.query.jobs) {evFiltered = evFiltered.filter(ev => evFilterJobs.includes(ev))}
					if (req.query.customers) {evFiltered = evFiltered.filter(ev => evFilterCustomers.includes(ev))}
					if (req.query.categories) {evFiltered = evFiltered.filter(ev => evFilterCategories.includes(ev))}
					params.events = evFiltered
				} else params.events = events.value

				// Parsing data to the calendar template
					// Filters
				params.customers = customers
				params.jobs = jobs
				params.categories = categories
					// Events overview
				params.duration = params.events.map(ev => ev.duration).reduce((t, i) => t + i)
				params.startDate = String(dayjs(params.events[0].start.dateTime).format('DD/MM/YY'))
				params.latestDate = String(dayjs(params.events[params.events.length-1].end.dateTime).format('DD/MM/YY'))
				// params.events defined above

      } catch (err) {
				console.log('error')
        req.flash('error_msg', {
          message: 'Could not fetch events',
          debug: JSON.stringify(err, Object.getOwnPropertyNames(err))
        });
      }
      res.render('calendar', params);
    }
  }
)

// ------------------------------ get calendar end *untouched below* ------------------------------------ //

/* GET /calendar/new */
router.get('/new',
  function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
      res.locals.newEvent = {};
      res.render('newevent');
    }
  }
);
// </GetEventFormSnippet>
// <PostEventFormSnippet>
/* POST /calendar/new */
router.post('/new', [
  body('ev-subject').escape(),
  // Custom sanitizer converts ;-delimited string
  // to an array of strings
  body('ev-attendees').customSanitizer(value => {
    return value.split(';');
  // Custom validator to make sure each
  // entry is an email address
  }).custom(value => {
    value.forEach(element => {
      if (!validator.isEmail(element)) {
        throw new Error('Invalid email address');
      }
    });

    return true;
  }),
  // Ensure start and end are ISO 8601 date-time values
  body('ev-start').isISO8601(),
  body('ev-end').isISO8601(),
  body('ev-body').escape()
], async function(req, res) {
  if (!req.session.userId) {
    // Redirect unauthenticated requests to home page
    res.redirect('/');
  } else {
    // Build an object from the form values
    const formData = {
      subject: req.body['ev-subject'],
      attendees: req.body['ev-attendees'],
      start: req.body['ev-start'],
      end: req.body['ev-end'],
      body: req.body['ev-body']
    };

    // Check if there are any errors with the form values
    const formErrors = validationResult(req);
    if (!formErrors.isEmpty()) {

      let invalidFields = '';
      formErrors.array().forEach(error => {
        invalidFields += `${error.param.slice(3, error.param.length)},`;
      });

      // Preserve the user's input when re-rendering the form
      // Convert the attendees array back to a string
      formData.attendees = formData.attendees.join(';');
      return res.render('newevent', {
        newEvent: formData,
        error: [{ message: `Invalid input in the following fields: ${invalidFields}` }]
      });
    }

    // Get the user
    const user = req.app.locals.users[req.session.userId];

    // Create the event
    try {
      await graph.createEvent(
        req.app.locals.msalClient,
        req.session.userId,
        formData,
        user.timeZone
      );
    } catch (error) {
      req.flash('error_msg', {
        message: 'Could not create event',
        debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
    }

    // Redirect back to the calendar view
    return res.redirect('/calendar');
  }
}
);
// </PostEventFormSnippet>
module.exports = router;
