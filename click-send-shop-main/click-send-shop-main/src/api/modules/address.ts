import { get, post, put, del } from "../request";
import type { Address, CreateAddressParams, UpdateAddressParams } from "@/types/address";

export function getAddresses() {
  return get<Address[]>("/addresses");
}

export function createAddress(params: CreateAddressParams) {
  return post<Address>("/addresses", params);
}

export function updateAddress(id: string, params: UpdateAddressParams) {
  return put<Address>(`/addresses/${id}`, params);
}

export function deleteAddress(id: string) {
  return del<void>(`/addresses/${id}`);
}

export function setDefaultAddress(id: string) {
  return put<void>(`/addresses/${id}/default`);
}
