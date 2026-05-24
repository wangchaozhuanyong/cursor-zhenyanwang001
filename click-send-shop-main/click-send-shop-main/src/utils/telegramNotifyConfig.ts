export const TELEGRAM_BOT_TOKEN_UNCHANGED = "__KEEP__";

export type TelegramParseMode = "HTML" | "Markdown" | "MarkdownV2";

export interface TelegramNotifyConfig {
  /** @deprecated 使用 orderNotifyEnabled */
  enabled?: boolean;
  orderNotifyEnabled: boolean;
  eventNotifyEnabled: boolean;
  eventNotifyImmediate: boolean;
  botToken: string;
  adminChatId: string;
  parseMode: TelegramParseMode;
  includeOrderItems: boolean;
  maxMessageLength: number;
  adminFrontendUrl: string;
}

export interface TelegramNotifySettings extends TelegramNotifyConfig {
  botTokenMasked: string;
  botTokenConfigured: boolean;
  configSource: "env" | "database";
}

export interface TelegramMessagePreview {
  eventType: string;
  parseMode: TelegramParseMode;
  totalParts: number;
  messages: string[];
  sampleOrderNo: string;
}

export const DEFAULT_TELEGRAM_NOTIFY_CONFIG: TelegramNotifyConfig = {
  orderNotifyEnabled: false,
  eventNotifyEnabled: false,
  eventNotifyImmediate: true,
  botToken: "",
  adminChatId: "",
  parseMode: "HTML",
  includeOrderItems: true,
  maxMessageLength: 3900,
  adminFrontendUrl: "",
};

export function normalizeTelegramNotifyConfig(input: Partial<TelegramNotifyConfig> | null | undefined): TelegramNotifyConfig {
  const source = input && typeof input === "object" ? input : {};
  const parseMode = source.parseMode === "Markdown" || source.parseMode === "MarkdownV2" ? source.parseMode : "HTML";
  const maxLen = Number(source.maxMessageLength);
  const orderNotifyEnabled = source.orderNotifyEnabled ?? source.enabled ?? false;
  return {
    enabled: orderNotifyEnabled === true,
    orderNotifyEnabled: orderNotifyEnabled === true,
    eventNotifyEnabled: source.eventNotifyEnabled === true,
    eventNotifyImmediate: source.eventNotifyImmediate !== false,
    botToken: String(source.botToken ?? "").trim(),
    adminChatId: String(source.adminChatId ?? "").trim(),
    parseMode,
    includeOrderItems: source.includeOrderItems !== false,
    maxMessageLength: Number.isFinite(maxLen) ? Math.min(4096, Math.max(500, Math.round(maxLen))) : 3900,
    adminFrontendUrl: String(source.adminFrontendUrl ?? "").trim().replace(/\/$/, ""),
  };
}

export function settingsToForm(settings: TelegramNotifySettings): TelegramNotifyConfig {
  const orderNotifyEnabled = settings.orderNotifyEnabled ?? settings.enabled ?? false;
  return {
    enabled: orderNotifyEnabled,
    orderNotifyEnabled,
    eventNotifyEnabled: settings.eventNotifyEnabled === true,
    eventNotifyImmediate: settings.eventNotifyImmediate !== false,
    botToken: "",
    adminChatId: settings.adminChatId,
    parseMode: settings.parseMode,
    includeOrderItems: settings.includeOrderItems,
    maxMessageLength: settings.maxMessageLength,
    adminFrontendUrl: settings.adminFrontendUrl,
  };
}
