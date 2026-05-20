import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const files = [
  "src/i18n/admin/messages/zh.ts",
  "src/i18n/admin/messages/en.ts",
  "src/modules/admin/pages/user/AdminUsers.tsx",
  "src/modules/admin/pages/user/AdminUserDetail.tsx",
  "src/services/admin/userService.ts",
  "src/api/admin/user.ts",
];

const badPatterns = [
  /绠＄悊/g,
  /璇峰厛鐧诲綍/g,
  /鍒囨崲/g,
  /宸茶/g,
  /涓枃/g,
  /锟/g,
  /\uFFFD/g,
];
let failed = false;

for (const rel of files) {
  const abs = resolve(process.cwd(), rel);
  const text = readFileSync(abs, "utf8");
  for (const pattern of badPatterns) {
    if (pattern.test(text)) {
      failed = true;
      console.error(`[i18n-health] mojibake detected in ${rel}: pattern ${pattern}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("[i18n-health] ok");
