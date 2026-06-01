// Backward compatibility for historical migrations and old imports.
// Runtime theme ownership has moved to the theme module.
module.exports = /** @type {any} */ (require('../../theme')).api;
