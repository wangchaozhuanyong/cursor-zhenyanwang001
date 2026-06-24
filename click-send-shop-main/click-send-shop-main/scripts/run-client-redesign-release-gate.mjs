import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const listOnly = args.has("--list") || process.env.LIST_CLIENT_RELEASE_GATE === "1";
const captureScreens = args.has("--capture") || process.env.CAPTURE_CLIENT_REDESIGN === "1";
const hasBaseUrl = Boolean(process.env.BASE_URL);
const hasAdminAuth = Boolean(process.env.ADMIN_BASE_URL && process.env.ADMIN_PASSWORD);

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function command(label, cmd, cmdArgs, options = {}) {
  return {
    label,
    cmd,
    args: cmdArgs,
    env: options.env || {},
    optional: Boolean(options.optional),
    reason: options.reason || "",
  };
}

function npm(label, script, options = {}) {
  return command(label, npmCmd, ["run", script], options);
}

const staticGate = [
  npm("ESLint", "lint"),
  npm("综合验证(typecheck/strict/check/build)", "verify"),
  npm("后台构建", "build:admin"),
  npm("dist/admin-dist/PWA 资源校验", "verify:dist"),
  npm("数据库迁移编号检查", "check:migrations"),
  npm("浏览器兼容单测", "test:browser-compat"),
  npm("主题硬编码颜色扫描", "theme:check"),
  npm("客户端重构提交范围检查", "check:client-redesign-scope"),
  command("Git diff 空白检查", "git", ["diff", "--check"]),
];

const browserGate = hasBaseUrl
  ? [
      npm("客户端路由烟测", "smoke:restructure"),
      command("客户端 E2E 入口检查", "node", ["scripts/verify-client-e2e.mjs"]),
      npm("UI 重叠扫描", "audit:overlap", {
        env: hasAdminAuth ? { REQUIRE_ADMIN_SCAN: process.env.REQUIRE_ADMIN_SCAN || "1" } : { SKIP_ADMIN: process.env.SKIP_ADMIN || "1" },
        reason: hasAdminAuth ? "" : "未提供 ADMIN_BASE_URL/ADMIN_PASSWORD，跳过后台登录态扫描",
      }),
      npm("路由切换扫描", "audit:route-transition", {
        env: hasAdminAuth ? { REQUIRE_ADMIN_SCAN: process.env.REQUIRE_ADMIN_SCAN || "1" } : {},
      }),
    ]
  : [];

const captureGate =
  hasBaseUrl && captureScreens
    ? [
        npm("移动端截图包", "capture:client-redesign", {
          env: { VIEWPORT: process.env.VIEWPORT || "390x844" },
        }),
        npm("桌面端截图包", "capture:client-redesign", {
          env: { VIEWPORT: "1280x800" },
        }),
      ]
    : [];

const steps = [...staticGate, ...browserGate, ...captureGate];

function describeEnvironment() {
  return {
    baseUrl: process.env.BASE_URL || "(missing: browser gate skipped)",
    apiBaseUrl: process.env.API_BASE_URL || "(default: BASE_URL/api)",
    adminBaseUrl: process.env.ADMIN_BASE_URL ? "(set)" : "(missing)",
    adminPassword: process.env.ADMIN_PASSWORD ? "(set)" : "(missing)",
    captureScreens: captureScreens ? "enabled" : "disabled",
  };
}

function printPlan() {
  console.log("[client-redesign-release-gate] environment");
  console.log(JSON.stringify(describeEnvironment(), null, 2));
  console.log("");
  console.log("[client-redesign-release-gate] steps");
  steps.forEach((step, index) => {
    const envKeys = Object.keys(step.env);
    const envText = envKeys.length ? ` env=${envKeys.join(",")}` : "";
    const reasonText = step.reason ? ` (${step.reason})` : "";
    console.log(`${index + 1}. ${step.label}: ${step.cmd} ${step.args.join(" ")}${envText}${reasonText}`);
  });
  if (!hasBaseUrl) {
    console.log("");
    console.log("Browser gate skipped because BASE_URL is not set.");
  }
  if (hasBaseUrl && !captureScreens) {
    console.log("Screenshot capture skipped. Set CAPTURE_CLIENT_REDESIGN=1 or pass --capture to enable it.");
  }
}

function runStep(step, index) {
  const env = { ...process.env, ...step.env };
  console.log("");
  console.log(`[client-redesign-release-gate] ${index + 1}/${steps.length} ${step.label}`);
  if (step.reason) {
    console.log(`[client-redesign-release-gate] ${step.reason}`);
  }
  const result = spawnSync(step.cmd, step.args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const err = new Error(`${step.label} failed with exit code ${result.status}`);
    err.exitCode = result.status || 1;
    throw err;
  }
}

printPlan();

if (listOnly) {
  process.exit(0);
}

const startedAt = Date.now();
const completed = [];

try {
  steps.forEach((step, index) => {
    runStep(step, index);
    completed.push(step.label);
  });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log("[client-redesign-release-gate] passed");
  console.log(JSON.stringify({ completed, seconds }, null, 2));
} catch (err) {
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.error("");
  console.error("[client-redesign-release-gate] failed");
  console.error(JSON.stringify({ completed, seconds, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(err.exitCode || 1);
}
