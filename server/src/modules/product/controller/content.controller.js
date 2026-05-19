const contentService = require('../service/content.service');

exports.siteInfo = async (_req, res, next) => {
  try {
    const info = await contentService.getPublicSiteInfo();
    res.success(info);
  } catch (err) { next(err); }
};

exports.homeOps = async (_req, res, next) => {
  try {
    const data = await contentService.getPublicHomeOps();
    res.success(data);
  } catch (err) { next(err); }
};

exports.pageBySlug = async (req, res, next) => {
  try {
    const page = await contentService.getContentPageBySlug(req.params.slug);
    if (!page) return res.fail(404, 'Page not found');
    res.success(page);
  } catch (err) { next(err); }
};


