const siteSettingsRepo = require('./repository/adminSiteSettings.repository');

const CHANNEL_TYPES = new Set(['wechat', 'whatsapp', 'telegram']);
const TYPE_LABELS = { wechat: '微信', whatsapp: 'WhatsApp', telegram: 'Telegram' };

function trim(value, max = 512) {
  return String(value ?? '').trim().slice(0, max);
}

function parseSupportChannelsFromRaw(raw) {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(parsed?.support?.channels)
    ? parsed.support.channels
    : Array.isArray(parsed?.channels)
      ? parsed.channels
      : [];
  return list
    .map((channel, index) => {
      const type = CHANNEL_TYPES.has(channel?.type) ? channel.type : null;
      if (!type) return null;
      const id = trim(channel?.id, 64) || `${type}-${index}`;
      return {
        id,
        type,
        name: trim(channel?.name, 64) || `${TYPE_LABELS[type]}客服`,
        account: trim(channel?.account, 128),
        enabled: channel?.enabled !== false,
        sort_order: Number(channel?.sortOrder ?? channel?.sort_order) || index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

async function listSupportChannels({ enabledOnly = false } = {}) {
  const raw = await siteSettingsRepo.selectSettingValue('supportDownloadConfig');
  const channels = parseSupportChannelsFromRaw(raw);
  return enabledOnly ? channels.filter((c) => c.enabled) : channels;
}

async function findSupportChannel(channelId, { requireEnabled = false } = {}) {
  const id = trim(channelId, 64);
  if (!id) return null;
  const channels = await listSupportChannels();
  const channel = channels.find((c) => c.id === id);
  if (!channel) return null;
  if (requireEnabled && !channel.enabled) return null;
  return channel;
}

function buildSupportNavLinkUrl(channelId) {
  const id = trim(channelId, 64);
  return id ? `/support-download?channelId=${encodeURIComponent(id)}` : '/support-download?tab=support';
}

module.exports = {
  listSupportChannels,
  findSupportChannel,
  buildSupportNavLinkUrl,
  parseSupportChannelsFromRaw,
};
