// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const router = require('express-promise-router').default();
const graph = require('../graph.js');
const dateFns = require('date-fns');
const zonedTimeToUtc = require('date-fns-tz/zonedTimeToUtc');
const iana = require('windows-iana');
const { body, validationResult } = require('express-validator');
const validator = require('validator');

var parseISO = require('date-fns/parseISO')
var differenceInHours = require('date-fns/differenceInHours') // mine

/* GET /calendar */
// <GetRouteSnippet>
router.get('/',
  async function(req, res) {
    if (!req.session.userId) {
      // Redirect unauthenticated requests to home page
      res.redirect('/');
    } else {
      const params = {
        active: { calendar: true }
      };

      // Get the user
      const user = req.app.locals.users[req.session.userId];
      // Convert user's Windows time zone ("Pacific Standard Time")
      // to IANA format ("America/Los_Angeles")
      const timeZoneId = iana.findIana(user.timeZone)[0];
      // console.log(`Time zone: ${timeZoneId.valueOf()}`);

      // Calculate the start and end of the current week
      // Get midnight on the start of the current week in the user's timezone,
      // but in UTC. For example, for Pacific Standard Time, the time value would be
      // 07:00:00Z
      var weekStart = zonedTimeToUtc(dateFns.startOfWeek(new Date()), timeZoneId.valueOf());
      var weekEnd = dateFns.addDays(weekStart, 7);
      // console.log(`Start: ${dateFns.formatISO(weekStart)}`);

      try {
        // Get the events
        const events = await graph.getCalendarView(
          req.app.locals.msalClient,
          req.session.userId,
          // dateFns.formatISO(weekStart),
					dateFns.formatISO(new Date(2022, 09, 09, 19, 5, 10)), // hardcoded start date
          dateFns.formatISO(weekEnd),
          user.timeZone
				)
        // Assign the events to the view parameters
        // params.events = events.value;

				// ------------------------------ my code start ------------------------------------ //
				// pulling unique subjects and categories
				let subjects = []
				let categories = []
				events.value.forEach((item, i) => {
					subjects.push(item.subject)
					categories = [...new Set(categories.concat(item.categories))]
					end = parseISO(item.end.dateTime)
					start = parseISO(item.start.dateTime)
					item.duration = differenceInHours(end, start)
					item.customer = item.subject.split(' - ')[0]
					item.job = item.subject.split(' - ')[1]
				})
				subjects = [...new Set(subjects)].filter(title => title.includes('-')) // filtered to only those with a '-'
				const customers = [...new Set(subjects.map(subject => subject.split(' - ')[0]))]
				const jobs = [...new Set(subjects.map(subject => subject.split(' - ')[1]))]
				// processing filters from the query // note: categories ADDs to the filters, not checks if all filters are met by an events categories
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
					// setting params.events to the events that are in all the filters
					let evFiltered = events.value
					if (req.query.jobs) {evFiltered = evFiltered.filter(ev => evFilterJobs.includes(ev))}
					if (req.query.customers) {evFiltered = evFiltered.filter(ev => evFilterCustomers.includes(ev))}
					if (req.query.categories) {evFiltered = evFiltered.filter(ev => evFilterCategories.includes(ev))}
					params.events = evFiltered
				} else params.events = events.value
				// parsing data to the calendar template
				params.customers = customers
				params.jobs = jobs
				params.categories = categories
				params.duration = params.events.map(ev => ev.duration).reduce((t, i) => t + i)
				// ------------------------------ my code end ------------------------------------ //

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
);
// </GetRouteSnippet>

// <GetEventFormSnippet>
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
