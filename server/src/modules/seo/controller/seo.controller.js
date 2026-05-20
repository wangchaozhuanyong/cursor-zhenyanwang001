const seoService = require('../service/seo.service');

exports.robots = (req, res, next) => {
  try {
    res.type('text/plain');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(seoService.buildRobotsTxt(req));
  } catch (err) {
    next(err);
  }
};

exports.sitemap = async (req, res, next) => {
  try {
    const xml = await seoService.buildSitemapXml(req);
    res.type('application/xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};
