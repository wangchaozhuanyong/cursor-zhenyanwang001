import { get, put } from "../request";
import type { UserProfile, UpdateProfileParams } from "@/types/user";

export function getProfile() {
  return get<UserProfile>("/user/profile");
}

export function updateProfile(params: UpdateProfileParams) {
  return put<UserProfile>("/user/profile", params);
}

export function changePassword(oldPassword: string, newPassword: string) {
  return put<void>("/user/password", { oldPassword, newPassword });
}
