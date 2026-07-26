import type { Config } from "tailwindcss";
import baseConfig from "./tailwind.config";

export default {
  ...baseConfig,
  content: [
    "./src/modules/public/pages/promotion/Promotions.tsx",
    "./src/components/store/StorePageHeader.tsx",
  ],
} satisfies Config;
