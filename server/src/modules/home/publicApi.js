const homeService = require('./service/home.service');

module.exports = {
  invalidateHomeBootstrapCache: homeService.invalidateHomeBootstrapCache,
};
