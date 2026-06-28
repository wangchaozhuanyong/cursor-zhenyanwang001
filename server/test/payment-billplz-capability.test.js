const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/payment/service/payments.service');
const repoPath = require.resolve('../src/modules/payment/repository/payments.repository');
const siteCapabilitiesPath = require.resolve('../src/modules/siteCapabilities/publicApi');

function clearPaymentServiceCache() {
  for (const path of [servicePath, repoPath, siteCapabilitiesPath]) {
    delete require.cache[path];
  }
}

function loadPaymentsService({ billplzEnabled = false } = {}) {
  clearPaymentServiceCache();

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      getPool() {
        return {};
      },
      async selectChannelsByCountryCurrency() {
        return [
          {
            id: 'manual-1',
            code: 'manual_bank',
            name: 'Manual Bank',
            provider: 'manual',
            country_code: 'MY',
            currency: 'MYR',
            sort_order: 1,
            environment: 'production',
          },
          {
            id: 'billplz-1',
            code: 'billplz_fpx',
            name: 'Billplz FPX',
            provider: 'billplz',
            country_code: 'MY',
            currency: 'MYR',
            sort_order: 2,
            environment: 'sandbox',
          },
        ];
      },
      async selectPaymentOrderByIdempotency() {
        return null;
      },
      async selectChannelByCode() {
        return {
          id: 'billplz-1',
          code: 'billplz_fpx',
          name: 'Billplz FPX',
          provider: 'billplz',
          currency: 'MYR',
          environment: 'sandbox',
        };
      },
    },
  };

  require.cache[siteCapabilitiesPath] = {
    id: siteCapabilitiesPath,
    filename: siteCapabilitiesPath,
    loaded: true,
    exports: {
      async isCapabilityEnabled(key) {
        assert.equal(key, 'billplzEnabled');
        return billplzEnabled;
      },
    },
  };

  return require(servicePath);
}

afterEach(() => {
  clearPaymentServiceCache();
});

test('listChannelsForUser hides Billplz / FPX channels when billplzEnabled is disabled', async () => {
  const service = loadPaymentsService({ billplzEnabled: false });

  const channels = await service.listChannelsForUser('MY', 'MYR');

  assert.deepEqual(channels.map((channel) => channel.code), ['manual_bank']);
});

test('createIntent rejects direct Billplz / FPX channel usage when billplzEnabled is disabled', async () => {
  const service = loadPaymentsService({ billplzEnabled: false });

  await assert.rejects(
    () => service.createIntent('user-1', { order_id: 'order-1', channel_code: 'billplz_fpx' }),
    /Billplz \/ FPX/,
  );
});
