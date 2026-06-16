const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  malaysiaRegionGroupForState,
  matchesShippingTemplate,
  pickBestShippingTemplate,
} = require('../src/utils/shippingFee');

test('malaysiaRegionGroupForState separates West and East Malaysia', () => {
  assert.equal(malaysiaRegionGroupForState('Selangor'), 'west_malaysia');
  assert.equal(malaysiaRegionGroupForState('Kuala Lumpur'), 'west_malaysia');
  assert.equal(malaysiaRegionGroupForState('Sabah'), 'east_malaysia');
  assert.equal(malaysiaRegionGroupForState('Sarawak'), 'east_malaysia');
});

test('shipping template matches destination postcode prefixes and ranges', () => {
  const tpl = {
    country_code: 'MY',
    region_group: 'east_malaysia',
    state_codes: JSON.stringify(['Sabah']),
    city_names: JSON.stringify(['Kota Kinabalu']),
    postcode_patterns: JSON.stringify(['88*', '89000-89999']),
    min_weight_kg: 0,
    max_weight_kg: 10,
    min_order_amount: 0,
    max_order_amount: null,
  };

  assert.equal(matchesShippingTemplate(tpl, {
    country: 'MY',
    state: 'Sabah',
    city: 'Kota Kinabalu',
    postcode: '88000',
  }, 50, 2), true);
  assert.equal(matchesShippingTemplate(tpl, {
    country: 'MY',
    state: 'Sabah',
    city: 'Kota Kinabalu',
    postcode: '87000',
  }, 50, 2), false);
});

test('pickBestShippingTemplate prefers the most specific matching rule', () => {
  const templates = [
    { id: 'all', country_code: 'MY', region_group: 'all', is_default: 1 },
    { id: 'east', country_code: 'MY', region_group: 'east_malaysia' },
    {
      id: 'kk',
      country_code: 'MY',
      region_group: 'east_malaysia',
      city_names: JSON.stringify(['Kota Kinabalu']),
      postcode_patterns: JSON.stringify(['88*']),
    },
  ];

  const picked = pickBestShippingTemplate(templates, {
    country: 'MY',
    state: 'Sabah',
    city: 'Kota Kinabalu',
    postcode: '88100',
  }, 80, 1.5);

  assert.equal(picked.id, 'kk');
});
