import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dist/**",
      "admin-dist",
      "admin-dist/**",
      "sw.js",
      "workbox-*.js",
      "**/vite.config.ts.timestamp-*.mjs",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/pages/**/*.{ts,tsx}",
      "src/modules/public/**/pages/**/*.{ts,tsx}",
      "src/modules/admin/pages/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/api/**"],
              message: "页面应通过 @/services 调用接口，禁止直接 import @/api。",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/contexts/**/*.{ts,tsx}",
      "src/modules/admin/context/**/*.{ts,tsx}",
      "src/components/SiteSocialLinks.tsx",
      "src/components/store/HomeNavIcon.tsx",
      "src/modules/admin/pages/product/inventory/inventoryDisplayUtils.tsx",
      "src/modules/admin/pages/user/userListDisplay.tsx",
      "src/modules/micro-interactions/modal/ModalLayerProvider.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
