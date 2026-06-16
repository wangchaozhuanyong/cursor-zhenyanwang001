export interface ShippingTemplate {
  /** 与库表 shipping_templates.id 一致（VARCHAR UUID） */
  id: string;
  name: string;
  regions: string;
  countryCode?: string;
  regionGroup?: "all" | "west_malaysia" | "east_malaysia" | "custom" | string;
  stateCodes?: string[];
  cityNames?: string[];
  postcodePatterns?: string[];
  baseFee: number;
  freeAbove: number;
  extraPerKg: number;
  minWeightKg?: number;
  maxWeightKg?: number | null;
  minOrderAmount?: number;
  maxOrderAmount?: number | null;
  ruleConfig?: unknown;
  enabled: boolean;
  /** 当前唯一默认生效模板（与 enabled 联动，仅一条为 true） */
  isDefault?: boolean;
}

export interface ShippingGlobalSettings {
  globalFreeAbove: number;
  globalBaseFee: number;
}

export interface ShippingCalcResult {
  templateId: string;
  templateName: string;
  fee: number;
  isFree: boolean;
}

export interface ShippingDestination {
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
}
