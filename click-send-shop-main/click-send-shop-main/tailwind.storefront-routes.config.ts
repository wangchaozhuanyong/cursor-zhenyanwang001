import type { Config } from "tailwindcss";
import baseConfig, {
  storefrontCriticalContent,
  storefrontProductionContent,
} from "./tailwind.config";

const criticalSourceFiles = storefrontCriticalContent
  .filter((file) => file.startsWith("./src/"))
  .map((file) => `!${file}`);

export default {
  ...baseConfig,
  content: [
    ...storefrontProductionContent,
    "!./index.html",
    ...criticalSourceFiles,
  ],
} satisfies Config;
