import * as userApi from "@/api/modules/user";
import type { UserProfile, UpdateProfileParams } from "@/types/user";

export async function fetchProfile(): Promise<UserProfile> {
  const res = await userApi.getProfile();
  return res.data;
}

export async function updateProfile(
  params: UpdateProfileParams,
): Promise<UserProfile> {
  const res = await userApi.updateProfile(params);
  return res.data;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await userApi.changePassword(oldPassword, newPassword);
}
