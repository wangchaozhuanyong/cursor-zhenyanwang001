import * as addressApi from "@/api/modules/address";
import type { Address, CreateAddressParams, UpdateAddressParams } from "@/types/address";

function mapAddress(raw: Record<string, unknown>): Address {
  return {
    id: raw.id as string,
    name: raw.name as string,
    phone: raw.phone as string,
    address: raw.address as string,
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
  };
}

export async function fetchAddresses(): Promise<Address[]> {
  const res = await addressApi.getAddresses();
  return (res.data as unknown as Record<string, unknown>[]).map(mapAddress);
}

export async function createAddress(params: CreateAddressParams): Promise<Address> {
  const res = await addressApi.createAddress(params);
  return mapAddress(res.data as unknown as Record<string, unknown>);
}

export async function updateAddress(id: string, params: UpdateAddressParams): Promise<Address> {
  const res = await addressApi.updateAddress(id, params);
  return mapAddress(res.data as unknown as Record<string, unknown>);
}

export async function deleteAddress(id: string): Promise<void> {
  await addressApi.deleteAddress(id);
}

export async function setDefault(id: string): Promise<void> {
  await addressApi.setDefaultAddress(id);
}
