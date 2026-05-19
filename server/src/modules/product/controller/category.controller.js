const catalogService = require('../service/catalog.service');

exports.getCategories = async (_req, res, next) => {
  try {
    const rows = await catalogService.getCategories();
    res.success(rows);
  } catch (err) { next(err); }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const row = await catalogService.getCategoryById(req.params.id);
    if (!row) return res.fail(404, 'Category not found');
    res.success(row);
  } catch (err) { next(err); }
};


