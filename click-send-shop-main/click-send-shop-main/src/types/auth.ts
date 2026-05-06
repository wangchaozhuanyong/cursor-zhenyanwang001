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
}
