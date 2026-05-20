export type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaPlatform = "android" | "ios" | "desktop";

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|duckduckgo|mercury/.test(ua);
  return isIOS && isSafari;
}

export function isAndroidChrome() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua) && /chrome\//.test(ua) && !/edg|opr|firefox|samsungbrowser|wv/.test(ua);
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export function getPwaInstallHelpText() {
  if (isAndroidChrome()) return "点击安装按钮并确认，即可添加到桌面。";
  if (isIosSafari()) return "请点击 Safari 分享按钮，再选择“添加到主屏幕”。";
  return "请使用 Chrome 或 Safari 添加到主屏幕。";
}
