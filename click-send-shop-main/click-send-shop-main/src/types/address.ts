export interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postcode: string;
  country: "MY";
  isDefault: boolean;
}

export type CreateAddressParams = Omit<Address, "id">;
export type UpdateAddressParams = Partial<Omit<Address, "id">>;

export const MALAYSIA_STATES = [
  "Selangor",
  "Kuala Lumpur",
  "Johor",
  "Penang",
  "Perak",
  "Sabah",
  "Sarawak",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Kelantan",
  "Terengganu",
  "Kedah",
  "Perlis",
  "Putrajaya",
  "Labuan",
] as const;

export type MalaysiaState = (typeof MALAYSIA_STATES)[number];
