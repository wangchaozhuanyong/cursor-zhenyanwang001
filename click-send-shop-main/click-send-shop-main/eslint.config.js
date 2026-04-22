import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      /** Vite 5 在解析 `vite.config.ts` 时可能生成临时文件，勿纳入 lint（且易残留 ENOENT） */
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
    },
  },
  /** 前台页面禁止直连 @/api，统一经 services（后台 admin 另见下方规则） */
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    ignores: ["src/pages/admin/**"],
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
  /** 管理后台：逐步收紧类型，当前先关闭 no-explicit-any 以通过门禁（技术债） */
  {
    files: ["src/pages/admin/**/*.{ts,tsx}", "src/api/admin/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
