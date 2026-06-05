const { getOrCreateNavIconThumb } = require('../service/navIconThumb.service');

async function getNavIconThumb(req, res, next) {
  try {
    const source = String(req.query.src || '').trim();
    const requestHost = String(req.headers.host || '').split(':')[0];
    const result = await getOrCreateNavIconThumb(source, { requestHost });

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-Nav-Icon-Thumb-Cache', result.cacheHit ? 'hit' : 'miss');
    return res.sendFile(result.filePath);
  } catch (error) {
    const statusCode = Number(error.statusCode || 0);
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ code: statusCode, message: 'Nav icon thumbnail is unavailable' });
    }
    return next(error);
  }
}

module.exports = {
  getNavIconThumb,
};
