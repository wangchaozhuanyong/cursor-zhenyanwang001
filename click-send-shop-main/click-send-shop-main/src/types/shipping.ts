export interface ShippingTemplate {
  id: number;
  name: string;
  regions: string;
  baseFee: number;
  freeAbove: number;
  extraPerKg: number;
  enabled: boolean;
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
