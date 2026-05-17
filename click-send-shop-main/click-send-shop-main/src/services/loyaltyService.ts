import { get } from "@/api/request";

export type LoyaltyConfig = {
  points: {
    displayEnabled: boolean;
    earnEnabled: boolean;
    redeemEnabled: boolean;
  };
  reward: {
    displayEnabled: boolean;
    referralEnabled: boolean;
    walletRedeemEnabled: boolean;
    withdrawEnabled: boolean;
  };
  checkout: {
    onlinePaymentEnabled: boolean;
    customerServicePaymentEnabled: boolean;
    pointsRedeemEnabled: boolean;
    rewardCashRedeemEnabled: boolean;
  };
};

export async function fetchLoyaltyConfig(): Promise<LoyaltyConfig> {
  const res = await get<LoyaltyConfig>("/loyalty/config");
  return res.data as LoyaltyConfig;
}

