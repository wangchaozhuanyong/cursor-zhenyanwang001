const pwaService = require('../service/pwa.service');

function createManifestHandler(options = {}) {
  const iconBasePath = options.iconBasePath || '/api/pwa';
  return async (req, res, next) => {
    try {
      const manifest = await pwaService.buildManifest(req, iconBasePath);
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(manifest);
    } catch (error) {
      next(error);
    }
  };
}

function createIconHandler(options) {
  return async (req, res, next) => {
    try {
      const buffer = await pwaService.buildIcon(req, options);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createManifestHandler,
  createIconHandler,
};
