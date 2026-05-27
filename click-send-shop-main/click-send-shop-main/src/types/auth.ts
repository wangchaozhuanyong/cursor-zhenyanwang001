export interface LoginParams {
  phone: string;
  countryCode?: string;
  password: string;
  challengeToken?: string;
  deviceId?: string;
  timezone?: string;
}

export interface RegisterParams {
  phone: string;
  countryCode: string;
  password: string;
  nickname?: string;
  inviteCode?: string;
  deviceId?: string;
  timezone?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  token: AuthToken;
  userId: string;
  role?: string;
}

export interface OtpSendParams {
  phone: string;
  countryCode: string;
}

export interface OtpLoginParams {
  phone: string;
  countryCode: string;
  code: string;
}

export interface AuthFeatures {
  smsOtpLoginEnabled: boolean;
  wechatLoginEnabled?: boolean;
}

export interface OAuthExchangeParams {
  provider: "google";
  code: string;
}

export interface WechatBindPhoneParams {
  phone: string;
  countryCode: string;
  smsCode: string;
  pendingWechatToken: string;
}
