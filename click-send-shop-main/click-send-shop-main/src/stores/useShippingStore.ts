import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as userShippingService from "@/services/userShippingService";
import type { ShippingTemplate } from "@/types/shipping";
import { calcShippingFee as calcFee } from "@/lib/shippingFee";

export type { ShippingTemplate };
export { estimateCartWeightKg, DEFAULT_ITEM_WEIGHT_KG } from "@/lib/shippingFee";

interface ShippingState {
  templates: ShippingTemplate[];
  loading: boolean;
  loadError: string | null;
  globalFreeAbove: number;
  globalBaseFee: number;
  loadTemplates: () => Promise<void>;
  setTemplates: (templates: ShippingTemplate[]) => void;
  addTemplate: (template: Omit<ShippingTemplate, "id">) => void;
  updateTemplate: (id: string, data: Partial<ShippingTemplate>) => void;
  removeTemplate: (id: string) => void;
  toggleTemplate: (id: string) => void;
  setGlobalSettings: (settings: { globalFreeAbove: number; globalBaseFee: number }) => void;
}

export const useShippingStore = create<ShippingState>()(
  persist(
    (set, get) => ({
      templates: [],
      loading: false,
      loadError: null,
      globalFreeAbove: 80,
      globalBaseFee: 8,

      loadTemplates: async () => {
        set({ loading: true, loadError: null });
        try {
          const list = await userShippingService.fetchShippingTemplates();
          set({ templates: list ?? [], loading: false });
        } catch (e) {
          set({
            loading: false,
            loadError: e instanceof Error ? e.message : "运费规则加载失败",
          });
        }
      },

      setTemplates: (templates) => set({ templates }),
      addTemplate: (data) => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}`;
        set({ templates: [...get().templates, { ...data, id }] });
      },
      updateTemplate: (id, data) =>
        set({ templates: get().templates.map((t) => (t.id === id ? { ...t, ...data } : t)) }),
      removeTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
      toggleTemplate: (id) =>
        set({ templates: get().templates.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)) }),
      setGlobalSettings: (settings) => set(settings),
    }),
    { name: "shipping-store" }
  )
);

export function calcShippingFee(
  template: ShippingTemplate,
  totalAmount: number,
  options?: { totalWeightKg?: number },
): number {
  return calcFee(template, totalAmount, options);
}
