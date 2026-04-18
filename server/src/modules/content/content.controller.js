const contentService = require('./content.service');

exports.siteInfo = async (_req, res, next) => {
  try {
    const info = await contentService.getPublicSiteInfo();
    res.success(info);
  } catch (err) { next(err); }
};

exports.pageBySlug = async (req, res, next) => {
  try {
    const page = await contentService.getContentPageBySlug(req.params.slug);
    if (!page) return res.fail(404, '页面不存在');
    res.success(page);
  } catch (err) { next(err); }
};
