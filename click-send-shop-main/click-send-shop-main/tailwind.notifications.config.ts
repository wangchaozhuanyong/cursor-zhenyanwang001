import type { Config } from "tailwindcss";
import baseConfig, { storefrontCriticalContent } from "./tailwind.config";
import { resolveStorefrontContent } from "./scripts/storefrontCriticalContent";

const criticalSourceFiles = new Set(
  storefrontCriticalContent.filter((file) => file.startsWith("./src/")),
);

const notificationsRouteContent = resolveStorefrontContent([
  "src/modules/public/pages/user/Notifications.tsx",
  "src/modules/micro-interactions/components/AppModal.tsx",
]);

export default {
  ...baseConfig,
  content: notificationsRouteContent.filter((file) => !criticalSourceFiles.has(file)),
} satisfies Config;
