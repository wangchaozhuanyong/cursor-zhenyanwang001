import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/useUserStore";
import { formatAddressForDisplay } from "@/services/addressService";
import type { Address } from "@/types/address";

/** 结算页收货人/地址状态与默认地址同步 */
export function useCheckoutAddress() {
  const { getDefaultAddress, loadAddresses } = useUserStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressLoaded, setAddressLoaded] = useState(false);

  useEffect(() => {
    loadAddresses().finally(() => setAddressLoaded(true));
  }, [loadAddresses]);

  useEffect(() => {
    if (!addressLoaded) return;
    const addr = getDefaultAddress();
    if (addr) {
      setName((prev) => prev || addr.recipient_name);
      setPhone((prev) => prev || addr.phone);
      setAddress((prev) => prev || formatAddressForDisplay(addr));
      setSelectedAddress(addr);
    }
  }, [addressLoaded, getDefaultAddress]);

  useEffect(() => {
    const handler = () => {
      const addr = getDefaultAddress();
      if (addr) {
        setName(addr.recipient_name);
        setPhone(addr.phone);
        setAddress(formatAddressForDisplay(addr));
        setSelectedAddress(addr);
      }
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [getDefaultAddress]);

  return {
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    selectedAddress,
    setSelectedAddress,
    addressLoaded,
  };
}
