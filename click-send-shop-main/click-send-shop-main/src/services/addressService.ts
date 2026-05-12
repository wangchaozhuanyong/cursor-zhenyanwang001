import * as addressApi from "@/api/modules/address";
import type { Address, CreateAddressParams, UpdateAddressParams } from "@/types/address";

const STRUCTURED_PREFIX = "__MYADDR_V1__:";

function toTextAddress(addr: Omit<Address, "id" | "isDefault">): string {
  return `${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city}, ${addr.state} ${addr.postcode}, ${addr.country}`;
}

function parseLegacyAddress(rawAddress: string) {
  const trimmed = String(rawAddress || "").trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith(STRUCTURED_PREFIX)) return null;
  const payload = trimmed.slice(STRUCTURED_PREFIX.length);
  try {
    return JSON.parse(payload) as Partial<Address>;
  } catch {
    return null;
  }
}

function encodeStructuredAddress(params: CreateAddressParams | UpdateAddressParams): string {
  const payload = {
    recipient_name: params.recipient_name,
    phone: params.phone,
    line1: params.line1,
    line2: params.line2,
    city: params.city,
    state: params.state,
    postcode: params.postcode,
    country: params.country || "MY",
  };
  return `${STRUCTURED_PREFIX}${JSON.stringify(payload)}`;
}

function mapAddress(raw: Record<string, unknown>): Address {
  const rawAddress = String(raw.address ?? "");
  const parsed = parseLegacyAddress(rawAddress);
  const fallbackName = String(raw.name ?? "");
  const fallbackPhone = String(raw.phone ?? "");
  const fallbackLine1 = parsed?.line1 || rawAddress;
  return {
    id: raw.id as string,
    recipient_name: String(parsed?.recipient_name || fallbackName),
    phone: String(parsed?.phone || fallbackPhone),
    line1: String(fallbackLine1 || ""),
    line2: parsed?.line2 ? String(parsed.line2) : "",
    city: String(parsed?.city || ""),
    state: String(parsed?.state || ""),
    postcode: String(parsed?.postcode || ""),
    country: "MY",
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
  };
}

export async function fetchAddresses(): Promise<Address[]> {
  const res = await addressApi.getAddresses();
  return (res.data as unknown as Record<string, unknown>[]).map(mapAddress);
}

export async function createAddress(params: CreateAddressParams): Promise<Address> {
  const res = await addressApi.createAddress({
    name: params.recipient_name,
    phone: params.phone,
    address: encodeStructuredAddress(params),
    isDefault: params.isDefault,
  } as unknown as CreateAddressParams);
  return mapAddress(res.data as unknown as Record<string, unknown>);
}

export async function updateAddress(id: string, params: UpdateAddressParams): Promise<Address> {
  const res = await addressApi.updateAddress(id, {
    ...(params.recipient_name ? { name: params.recipient_name } : {}),
    ...(params.phone ? { phone: params.phone } : {}),
    ...(params.line1 || params.city || params.state || params.postcode || params.country || params.line2 !== undefined
      ? { address: encodeStructuredAddress(params) }
      : {}),
    ...(params.isDefault !== undefined ? { isDefault: params.isDefault } : {}),
  } as unknown as UpdateAddressParams);
  return mapAddress(res.data as unknown as Record<string, unknown>);
}

export async function deleteAddress(id: string): Promise<void> {
  await addressApi.deleteAddress(id);
}

export async function setDefault(id: string): Promise<void> {
  await addressApi.setDefaultAddress(id);
}

export function formatAddressForDisplay(addr: Pick<Address, "line1" | "line2" | "city" | "state" | "postcode" | "country">): string {
  return toTextAddress({
    recipient_name: "",
    phone: "",
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postcode: addr.postcode,
    country: addr.country,
  });
}
