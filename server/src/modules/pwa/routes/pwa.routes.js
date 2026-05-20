const express = require('express');
const pwaController = require('../controller/pwa.controller');

function createPwaBrandRouter(options = {}) {
  const router = express.Router();
  const iconBasePath = options.iconBasePath || '/api/pwa';
  router.get('/manifest.webmanifest', pwaController.createManifestHandler({ iconBasePath }));
  router.get('/icon-192x192.png', pwaController.createIconHandler({ size: 192, maskable: false }));
  router.get('/icon-512x512.png', pwaController.createIconHandler({ size: 512, maskable: false }));
  router.get('/icon-maskable-512x512.png', pwaController.createIconHandler({ size: 512, maskable: true }));
  router.get('/apple-touch-icon.png', pwaController.createIconHandler({ size: 180, maskable: true }));

  return router;
}

function registerPwaBrandRoutes(app) {
  const rootRouter = createPwaBrandRouter({ iconBasePath: '/api/pwa' });
  const forwardToRootRouter = (targetUrl) => (req, res, next) => {
    req.url = targetUrl;
    return rootRouter(req, res, next);
  };

  app.get('/manifest.webmanifest', forwardToRootRouter('/manifest.webmanifest'));
  app.get('/pwa-192x192.png', (req, res, next) => {
    req.url = '/icon-192x192.png';
    rootRouter(req, res, next);
  });
  app.get('/pwa-512x512.png', (req, res, next) => {
    req.url = '/icon-512x512.png';
    rootRouter(req, res, next);
  });
  app.get('/pwa-maskable-512x512.png', (req, res, next) => {
    req.url = '/icon-maskable-512x512.png';
    rootRouter(req, res, next);
  });
  app.get('/apple-touch-icon.png', (req, res, next) => {
    req.url = '/apple-touch-icon.png';
    rootRouter(req, res, next);
  });
}

module.exports = { createPwaBrandRouter, registerPwaBrandRoutes };
