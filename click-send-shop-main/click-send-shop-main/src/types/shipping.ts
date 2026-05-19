export interface ShippingTemplate {
  id: number;
  name: string;
  regions: string;
  baseFee: number;
  freeAbove: number;
  extraPerKg: number;
  enabled: boolean;
  /** 当前唯一默认生效模板（与 enabled 联动，仅一条为 true） */
  isDefault?: boolean;
}

export interface ShippingGlobalSettings {
  globalFreeAbove: number;
  globalBaseFee: number;
}

export interface ShippingCalcResult {
  templateId: number;
  templateName: string;
  fee: number;
  isFree: boolean;
}
