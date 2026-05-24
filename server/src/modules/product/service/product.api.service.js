const catalogService = require('./catalog.service');
const { BusinessError } = require('../../../errors/BusinessError');

async function listProducts(query) {
  return catalogService.getProducts(query);
}

async function getProductById(id) {
  const data = await catalogService.getProductById(id);
  if (!data) throw new BusinessError(404, '商品不存在');
  return data;
}

module.exports = {
  listProducts,
  getProductById,
};
