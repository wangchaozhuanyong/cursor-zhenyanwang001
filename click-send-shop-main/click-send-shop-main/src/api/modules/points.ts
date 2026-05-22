import { get, post } from "@/api/request";
import type { PointsRecord, PointsListParams } from "@/types/points";
import type { PaginatedData } from "@/types/common";

export function getPointsRecords(params?: PointsListParams) {
  return get<PaginatedData<PointsRecord>>("/points/records", params as unknown as Record<string, string>);
}

export function getPointsBalance() {
  return get<{ balance: number }>("/points/balance");
}

export type PointsClientConfig = {
  signIn: {
    points: number;
    enabled: boolean;
    usesDefault: boolean;
    disabledReason?: string | null;
  };
  orderPointsHint: string;
};

export function getPointsConfig() {
  return get<PointsClientConfig>("/points/config");
}

export function signIn() {
  return post<{ points: number }>("/points/sign-in");
}

export type PointsGiftCatalogItem = {
  id: string;
  title: string;
  image: string;
  required_points: number;
  cash_amount: number;
  remaining_stock: number | null;
  limit_per_user: number;
  product_id: string;
};

export function getPointsGifts() {
  return get<{ list: PointsGiftCatalogItem[] }>("/points/gifts");
}

export function getPointsGift(id: string) {
  return get<PointsGiftCatalogItem>(`/points/gifts/${id}`);
}

export function redeemPointsGift(body: {
  gift_item_id: string;
  quantity?: number;
  contact_name: string;
  contact_phone: string;
  address: Record<string, string>;
  note?: string;
}) {
  return post<{ order_id: string; order_no: string; points_used: number; cash_amount: number; payment_status: string }>(
    "/points/gifts/redeem",
    body,
  );
}

