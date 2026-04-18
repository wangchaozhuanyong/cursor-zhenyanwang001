export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export type CreateAddressParams = Omit<Address, "id">;
export type UpdateAddressParams = Partial<Omit<Address, "id">>;
