const repo = require('../repository/loyalty.repository');

function pickPaymentMethodEnabled(methods, code) {
  return methods.includes(code);
}

async function getLoyaltyConfig() {
  const [points, reward] = await Promise.all([
    repo.selectPointsSettings(),
    repo.selectRewardSettings(),
  ]);
  const pointMethods = repo.parseJsonArray(points?.allowed_payment_methods, ['online', 'whatsapp']);
  const rewardMethods = repo.parseJsonArray(reward?.allowed_payment_methods, ['online', 'whatsapp']);
  const enabledPaymentMethods = [...new Set([...pointMethods, ...rewardMethods])];

  return {
    data: {
      points: {
        displayEnabled: !!points?.display_enabled,
        earnEnabled: !!points?.earn_enabled,
        redeemEnabled: !!points?.redeem_enabled,
      },
      reward: {
        displayEnabled: !!reward?.display_enabled,
        referralEnabled: reward?.referral_enabled == null ? true : !!reward.referral_enabled,
        walletRedeemEnabled: !!reward?.wallet_redeem_enabled,
        withdrawEnabled: false,
      },
      checkout: {
        onlinePaymentEnabled: pickPaymentMethodEnabled(enabledPaymentMethods, 'online'),
        customerServicePaymentEnabled: pickPaymentMethodEnabled(enabledPaymentMethods, 'whatsapp'),
        pointsRedeemEnabled: !!points?.redeem_enabled && !!points?.display_enabled,
        rewardCashRedeemEnabled: !!reward?.wallet_redeem_enabled && !!reward?.display_enabled,
      },
    },
  };
}

module.exports = {
  getLoyaltyConfig,
};
