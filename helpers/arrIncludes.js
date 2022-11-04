const hbs = require('hbs')

hbs.registerHelper('arrIncludes', (arg1, arg2, options) => {
    return String(arg1) == String(arg2) ? options.fn(this) : options.inverse(this)
})

// arg1 = the string
// arg2 = the array
// if arg2 includes arg1, return 'selected' option, else nothing

module.exports = hbs
