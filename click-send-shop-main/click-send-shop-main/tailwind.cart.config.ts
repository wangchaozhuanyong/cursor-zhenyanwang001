import type { Config } from "tailwindcss";
import baseConfig, { storefrontCriticalContent } from "./tailwind.config";
import { resolveStorefrontContent } from "./scripts/storefrontCriticalContent";

const criticalSourceFiles = new Set(
  storefrontCriticalContent.filter((file) => file.startsWith("./src/")),
);

const cartRouteContent = resolveStorefrontContent([
  "src/modules/public/pages/cart/Cart.tsx",
  "src/modules/micro-interactions/components/AppModal.tsx",
  "src/modules/micro-interactions/components/BottomSheetConfirm.tsx",
  "src/components/CouponPicker.tsx",
]);

export default {
  ...baseConfig,
  content: cartRouteContent.filter((file) => !criticalSourceFiles.has(file)),
} satisfies Config;
