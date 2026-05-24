const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  migrateSupportSettings,
  stripHelpCenterConfig,
  parseSupportConfigRaw,
  LEGACY_IM_KEYS,
} = require('../src/data/supportDownloadMigration');

describe('supportDownloadMigration', () => {
  test('merges legacy IM fields into supportDownloadConfig', () => {
    const { supportDownloadConfig } = migrateSupportSettings({
      contactWhatsApp: '60123456789',
      wechatId: 'my_wechat',
      businessHours: '每天 9:00 - 22:00',
    });
    assert.equal(supportDownloadConfig.support.workingHours, '每天 9:00 - 22:00');
    assert.equal(supportDownloadConfig.support.channels.length, 2);
    assert.equal(supportDownloadConfig.support.channels[0].type, 'whatsapp');
    assert.equal(supportDownloadConfig.support.channels[1].account, 'my_wechat');
  });

  test('does not overwrite existing channels', () => {
    const existing = {
      supportDownloadConfig: JSON.stringify({
        support: {
          channels: [
            {
              id: 'wa-1',
              type: 'whatsapp',
              name: '官方 WA',
              enabled: true,
              account: '600',
              linkUrl: 'https://wa.me/600',
              sortOrder: 1,
            },
          ],
        },
      }),
      whatsappUrl: 'https://wa.me/legacy',
    };
    const { supportDownloadConfig } = migrateSupportSettings(existing);
    assert.equal(supportDownloadConfig.support.channels.length, 1);
    assert.equal(supportDownloadConfig.support.channels[0].id, 'wa-1');
  });

  test('stripHelpCenterConfig removes deprecated fields', () => {
    const { json, changed } = stripHelpCenterConfig(
      JSON.stringify({
        workingHours: '9-18',
        contactNote: 'call us',
        categories: [],
        faqs: [],
      }),
    );
    assert.equal(changed, true);
    assert.equal(json.workingHours, undefined);
    assert.equal(json.contactNote, undefined);
    assert.ok(Array.isArray(json.categories));
  });

  test('preserves empty support and channel descriptions', () => {
    const config = parseSupportConfigRaw(JSON.stringify({
      support: {
        description: '',
        channels: [
          {
            id: 'wx-1',
            type: 'wechat',
            name: '微信客服',
            enabled: true,
            account: '2421412412535',
            description: '',
            sortOrder: 1,
          },
        ],
      },
      download: { description: '' },
    }));
    assert.equal(config.support.description, '');
    assert.equal(config.support.channels[0].description, '');
    assert.equal(config.download.description, '');
  });

  test('LEGACY_IM_KEYS lists deprecated site setting keys', () => {
    assert.deepEqual(LEGACY_IM_KEYS.sort(), [
      'businessHours',
      'contactWhatsApp',
      'wechatId',
      'whatsappUrl',
    ].sort());
  });
});
