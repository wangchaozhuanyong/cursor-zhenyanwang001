const loyaltyApi = /** @type {any} */ (require('../../loyalty/publicApi'));

function getLoyaltyApi() {
  return loyaltyApi || {};
}

function requireLoyaltyApi(name) {
  const fn = getLoyaltyApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Loyalty module API missing method: ${name}`);
  }
  return fn;
}

async function listGiftItems(query = {}) {
  return requireLoyaltyApi('listGiftItemsAdmin')(query);
}

async function createGiftItem(body) {
  return requireLoyaltyApi('createGiftItemAdmin')(body);
}

async function updateGiftItem(id, body) {
  return requireLoyaltyApi('updateGiftItemAdmin')(id, body);
}

async function deleteGiftItem(id) {
  return requireLoyaltyApi('deleteGiftItemAdmin')(id);
}

async function listRedemptions(query = {}) {
  return requireLoyaltyApi('listGiftRedemptionsAdmin')(query);
}

module.exports = {
  listGiftItems,
  createGiftItem,
  updateGiftItem,
  deleteGiftItem,
  listRedemptions,
};
