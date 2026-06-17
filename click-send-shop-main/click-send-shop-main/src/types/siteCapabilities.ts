export interface SiteCapabilities {
  mallEnabled: boolean;
  serviceEnabled: boolean;
  onlinePaymentEnabled: boolean;
  pointsEnabled: boolean;
  couponEnabled: boolean;
  reviewEnabled: boolean;
  inventoryEnabled: boolean;
  shippingEnabled: boolean;
  memberLevelEnabled: boolean;
  customerServiceDownloadEnabled: boolean;
  smsOtpLoginEnabled: boolean;
  telegramOrderNotifyEnabled: boolean;
  languageGateEnabled: boolean;
  storefrontMultilingualEnabled: boolean;
  restrictedProductComplianceEnabled: boolean;
  trafficAnalyticsEnabled: boolean;
  /** 开启后，导出/下载等操作需二次确认 */
  downloadConfirmEnabled: boolean;
}

export const DEFAULT_SITE_CAPABILITIES: SiteCapabilities = {
  mallEnabled: true,
  serviceEnabled: true,
  onlinePaymentEnabled: true,
  pointsEnabled: true,
  couponEnabled: true,
  reviewEnabled: true,
  inventoryEnabled: true,
  shippingEnabled: true,
  memberLevelEnabled: true,
  customerServiceDownloadEnabled: true,
  smsOtpLoginEnabled: true,
  telegramOrderNotifyEnabled: true,
  languageGateEnabled: false,
  storefrontMultilingualEnabled: false,
  restrictedProductComplianceEnabled: true,
  trafficAnalyticsEnabled: true,
  downloadConfirmEnabled: true,
};

export interface RuntimeConfig {
  siteCode: string;
  siteName: string;
  publicAppUrl: string;
  features: SiteCapabilities;
  upload: {
    storage: string;
    presignEnabled: boolean;
  };
}
