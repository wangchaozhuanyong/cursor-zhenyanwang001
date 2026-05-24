/**
 * 将遗留站点客服字段合并进 supportDownloadConfig，并精简 helpCenterConfig（仅 FAQ）。
 * 供迁移脚本与后台保存逻辑复用。
 */

const CHANNEL_TYPES = new Set(['wechat', 'whatsapp', 'telegram']);

const DEFAULT_PLATFORMS = [
  {
    id: 'android',
    type: 'android',
    enabled: true,
    title: '安卓手机',
    description: '可将商城添加到安卓手机桌面，像 App 一样快速打开。',
    buttonText: '一键添加到桌面',
    instructions: [
      '点击浏览器右上角“菜单”或“...”',
      '选择“添加到桌面 / 添加到主屏幕 / 发送到桌面”',
      '点击确认后，回到手机桌面打开',
    ],
    sortOrder: 1,
  },
  {
    id: 'ios',
    type: 'ios',
    enabled: true,
    title: '苹果手机',
    description: '请使用 Safari 浏览器将商城添加到主屏幕。',
    buttonText: '复制链接，用 Safari 打开',
    instructions: [
      '用 Safari 打开本页面',
      '点击底部中间的“分享”按钮',
      '向下滑动，选择“添加到主屏幕”',
      '点击右上角“添加”',
      '回到手机桌面打开',
    ],
    sortOrder: 2,
  },
];

const DEFAULT_SUPPORT_DOWNLOAD_CONFIG = {
  enabled: true,
  title: '客服中心',
  subtitle: '如需咨询商品、订单、售后或使用问题，请联系官方客服；也可查看添加到桌面的使用指引。',
  defaultTab: 'support',
  support: {
    enabled: true,
    title: '联系客服',
    description: '请选择下方官方客服渠道咨询商品、订单、售后或使用问题。',
    workingHours: '',
    channels: [],
  },
  download: {
    enabled: true,
    title: '添加到桌面',
    description: '可将商城添加到手机桌面，像 App 一样快速打开。',
    platforms: DEFAULT_PLATFORMS,
  },
};

const LEGACY_IM_KEYS = ['contactWhatsApp', 'whatsappUrl', 'wechatId', 'businessHours'];

function trim(value) {
  return String(value ?? '').trim();
}

function resolveOptionalConfigText(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return trim(value);
}

function resolveFromSources(sources, fallback) {
  for (const source of sources) {
    if (source !== undefined && source !== null) return trim(source);
  }
  return fallback;
}

function normalizeChannel(channel, index) {
  const type = CHANNEL_TYPES.has(channel?.type) ? channel.type : null;
  if (!type) return null;
  const typeLabel = type === 'wechat' ? '微信' : type === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  return {
    id: trim(channel?.id) || `${type}-${index}`,
    type,
    name: trim(channel?.name) || `${typeLabel}客服`,
    enabled: channel?.enabled !== false,
    account: trim(channel?.account),
    linkUrl: trim(channel?.linkUrl),
    qrUrl: trim(channel?.qrUrl),
    description: trim(channel?.description),
    sortOrder: Number(channel?.sortOrder) || index + 1,
  };
}

function parseSupportConfigRaw(raw) {
  if (!trim(raw)) return structuredClone(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const legacyChannels = Array.isArray(parsed?.channels) ? parsed.channels : undefined;
    const rawChannels = Array.isArray(parsed?.support?.channels) ? parsed.support.channels : legacyChannels;
    const channels = (rawChannels || [])
      .map(normalizeChannel)
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const platforms = Array.isArray(parsed?.download?.platforms) && parsed.download.platforms.length
      ? parsed.download.platforms
      : DEFAULT_PLATFORMS;
    return {
      enabled: parsed?.enabled !== false,
      title: resolveOptionalConfigText(parsed?.title, DEFAULT_SUPPORT_DOWNLOAD_CONFIG.title),
      subtitle: resolveOptionalConfigText(parsed?.subtitle, DEFAULT_SUPPORT_DOWNLOAD_CONFIG.subtitle),
      defaultTab: parsed?.defaultTab === 'download' ? 'download' : 'support',
      support: {
        enabled: parsed?.support?.enabled !== false,
        title: resolveOptionalConfigText(parsed?.support?.title, DEFAULT_SUPPORT_DOWNLOAD_CONFIG.support.title),
        description: resolveFromSources(
          [parsed?.support?.description, parsed?.supportDescription],
          DEFAULT_SUPPORT_DOWNLOAD_CONFIG.support.description,
        ),
        workingHours: trim(parsed?.support?.workingHours ?? parsed?.workingHours),
        channels,
      },
      download: {
        enabled: parsed?.download?.enabled !== false && parsed?.showAppInstall !== false,
        title: resolveFromSources(
          [parsed?.download?.title, parsed?.appInstallTitle],
          DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.title,
        ),
        description: resolveFromSources(
          [parsed?.download?.description, parsed?.appInstallDescription],
          DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.description,
        ),
        platforms,
      },
    };
  } catch {
    return structuredClone(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
  }
}

function buildLegacyChannels(settings) {
  const channels = [];
  const waDigits = trim(settings.contactWhatsApp).replace(/\D/g, '');
  const waLink = trim(settings.whatsappUrl) || (waDigits ? `https://wa.me/${waDigits}` : '');
  if (waLink || waDigits) {
    channels.push({
      id: 'legacy-whatsapp',
      type: 'whatsapp',
      name: 'WhatsApp 客服',
      enabled: true,
      account: waDigits || trim(settings.contactWhatsApp),
      linkUrl: waLink,
      qrUrl: '',
      description: '',
      sortOrder: 1,
    });
  }
  const wechatId = trim(settings.wechatId);
  if (wechatId) {
    channels.push({
      id: 'legacy-wechat',
      type: 'wechat',
      name: '微信客服',
      enabled: true,
      account: wechatId,
      linkUrl: '',
      qrUrl: '',
      description: '',
      sortOrder: 2,
    });
  }
  return channels;
}

function readHelpCenterWorkingHours(helpCenterConfig) {
  if (!trim(helpCenterConfig)) return '';
  try {
    const parsed = JSON.parse(helpCenterConfig);
    return trim(parsed?.workingHours);
  } catch {
    return '';
  }
}

/**
 * @param {Record<string, string>} settings site_settings 键值
 * @returns {{ supportDownloadConfig: object, helpCenterConfig: object|null, helpCenterChanged: boolean }}
 */
function migrateSupportSettings(settings = {}) {
  const config = parseSupportConfigRaw(settings.supportDownloadConfig);
  let channels = [...(config.support.channels || [])];

  if (channels.length === 0) {
    channels = buildLegacyChannels(settings);
  }

  let workingHours = trim(config.support.workingHours);
  if (!workingHours) {
    workingHours = trim(settings.businessHours) || readHelpCenterWorkingHours(settings.helpCenterConfig);
  }

  const nextSupport = {
    ...config,
    support: {
      ...config.support,
      workingHours,
      channels,
    },
  };

  let helpCenterConfig = null;
  let helpCenterChanged = false;
  if (trim(settings.helpCenterConfig)) {
    try {
      const parsed = JSON.parse(settings.helpCenterConfig);
      if (parsed && typeof parsed === 'object') {
        const stripped = { ...parsed };
        if ('workingHours' in stripped || 'contactNote' in stripped) {
          helpCenterChanged = Boolean(stripped.workingHours || stripped.contactNote);
          delete stripped.workingHours;
          delete stripped.contactNote;
        }
        helpCenterConfig = stripped;
      }
    } catch {
      helpCenterConfig = null;
    }
  }

  return {
    supportDownloadConfig: nextSupport,
    helpCenterConfig,
    helpCenterChanged,
  };
}

function stripHelpCenterConfig(raw) {
  if (!trim(raw)) return { json: null, changed: false };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { json: null, changed: false };
    const next = { ...parsed };
    const changed = Boolean(next.workingHours || next.contactNote);
    delete next.workingHours;
    delete next.contactNote;
    return { json: next, changed };
  } catch {
    return { json: null, changed: false };
  }
}

module.exports = {
  LEGACY_IM_KEYS,
  DEFAULT_SUPPORT_DOWNLOAD_CONFIG,
  migrateSupportSettings,
  stripHelpCenterConfig,
  parseSupportConfigRaw,
};
