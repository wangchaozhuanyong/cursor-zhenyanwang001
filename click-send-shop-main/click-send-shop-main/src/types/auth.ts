export interface LoginParams {
  phone: string;
  countryCode?: string;
  password: string;
}

export interface RegisterParams {
  phone: string;
  countryCode: string;
  password: string;
  nickname?: string;
  inviteCode?: string;
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
}

export interface OAuthExchangeParams {
  provider: "google" | "facebook";
  code: string;
}
