const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatPublicProduct } = require('../src/utils/helpers');
const { formatOrder, formatAdminOrder } = require('../src/modules/order/order.mapper');
const cartService = require('../src/modules/cart/service/cart.service');
const cartRepo = require('../src/modules/cart/repository/cart.repository');
const favoritesService = require('../src/modules/user/service/favorites.service');
const favoritesRepo = require('../src/modules/user/repository/favorites.repository');
const historyService = require('../src/modules/user/service/history.service');
const historyRepo = require('../src/modules/user/repository/history.repository');

const INTERNAL_PRODUCT_FIELDS = [
  'stock_warning_threshold',
  'stock_lower_limit',
  'stock_upper_limit',
];
const INTERNAL_ORDER_FIELDS = [
  'shipping_cost_amount',
  'payment_fee_amount',
  'goods_cost_amount',
  'gross_profit_amount',
  'net_profit_amount',
];

function productRow() {
  return {
    id: 'product-1',
    name: '7星1',
    cover_image: '',
    images: '[]',
    image_alt_json: '[]',
    price: 30,
    original_price: 40,
    points: 0,
    category_id: 'category-1',
    category_name: '正品烟草',
    stock: 8,
    stock_warning_threshold: 5,
    stock_lower_limit: 3,
    stock_upper_limit: 20,
    lifecycle_status: 1,
    status: 'active',
    qty: 1,
  };
}

function orderRow() {
  return {
    id: 'order-1',
    order_no: 'ORDER-1',
    raw_amount: 30,
    discount_amount: 0,
    shipping_fee: 5,
    shipping_cost_amount: 2,
    payment_fee_amount: 1,
    goods_cost_amount: 10,
    gross_profit_amount: 20,
    net_profit_amount: 22,
    total_amount: 35,
    total_points: 0,
    status: 'paid',
    payment_status: 'paid',
  };
}

function assertFieldsHidden(value, fields) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not be public`);
  }
}

test('public product formatter removes inventory controls while preserving category context', () => {
  const product = formatPublicProduct(productRow());

  assertFieldsHidden(product, INTERNAL_PRODUCT_FIELDS);
  assert.equal(product.category_name, '正品烟草');
  assert.equal(product.stock, 8);
});

test('cart, favorites, and history all use the public product contract', async (t) => {
  const originals = {
    cartDeleteUnavailable: cartRepo.deleteUnavailableCartItems,
    cartSelectLines: cartRepo.selectCartLinesWithProducts,
    favoritesCount: favoritesRepo.countByUser,
    favoritesSelectPage: favoritesRepo.selectPage,
    historyCount: historyRepo.countByUser,
    historySelectPage: historyRepo.selectPage,
  };

  cartRepo.deleteUnavailableCartItems = async () => {};
  cartRepo.selectCartLinesWithProducts = async () => [productRow()];
  favoritesRepo.countByUser = async () => 1;
  favoritesRepo.selectPage = async () => [productRow()];
  historyRepo.countByUser = async () => 1;
  historyRepo.selectPage = async () => [{
    ...productRow(),
    history_id: 'history-1',
    viewed_at: '2026-07-29T00:00:00.000Z',
  }];

  t.after(() => {
    cartRepo.deleteUnavailableCartItems = originals.cartDeleteUnavailable;
    cartRepo.selectCartLinesWithProducts = originals.cartSelectLines;
    favoritesRepo.countByUser = originals.favoritesCount;
    favoritesRepo.selectPage = originals.favoritesSelectPage;
    historyRepo.countByUser = originals.historyCount;
    historyRepo.selectPage = originals.historySelectPage;
  });

  const cart = await cartService.getCart('user-1');
  const favorites = await favoritesService.getFavorites('user-1', {});
  const history = await historyService.getHistory('user-1', {});

  assertFieldsHidden(cart[0].product, INTERNAL_PRODUCT_FIELDS);
  assertFieldsHidden(favorites.list[0], INTERNAL_PRODUCT_FIELDS);
  assertFieldsHidden(history.list[0].product, INTERNAL_PRODUCT_FIELDS);
  assert.equal(cart[0].product.category_name, '正品烟草');
  assert.equal(favorites.list[0].category_name, '正品烟草');
  assert.equal(history.list[0].product.category_name, '正品烟草');
});

test('customer order contract omits operational costs and profit while admin retains them', () => {
  const customerOrder = formatOrder(orderRow(), []);
  const adminOrder = formatAdminOrder(orderRow(), []);

  assertFieldsHidden(customerOrder, INTERNAL_ORDER_FIELDS);
  assert.equal(customerOrder.total_amount, 35);
  for (const field of INTERNAL_ORDER_FIELDS) {
    assert.equal(Object.hasOwn(adminOrder, field), true, `${field} must remain available to admin`);
  }
  assert.equal(adminOrder.net_profit_amount, 22);
});
