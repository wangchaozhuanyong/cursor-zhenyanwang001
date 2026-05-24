import { getCachedSiteCapabilities } from "@/hooks/useSiteCapabilities";

export type DownloadConfirmRequest = {
  title?: string;
  description?: string;
  fileName?: string;
  confirmText?: string;
  cancelText?: string;
};

export type DownloadConfirmHandler = (request: DownloadConfirmRequest) => Promise<boolean>;

let dialogHandler: DownloadConfirmHandler | null = null;

export function registerDownloadConfirmDialog(handler: DownloadConfirmHandler | null) {
  dialogHandler = handler;
}

export function isDownloadConfirmEnabled(): boolean {
  return getCachedSiteCapabilities().downloadConfirmEnabled !== false;
}

function buildDescription(request: DownloadConfirmRequest): string {
  if (request.description) return request.description;
  if (request.fileName) return `即将下载「${request.fileName}」到本机，是否继续？`;
  return "即将下载文件到本机，是否继续？";
}

/** 若全局开关开启则弹出确认；返回 true 表示用户同意下载 */
export async function confirmBeforeDownload(request: DownloadConfirmRequest = {}): Promise<boolean> {
  if (!isDownloadConfirmEnabled()) return true;

  const title = request.title ?? "确认下载";
  const description = buildDescription(request);

  if (dialogHandler) {
    return dialogHandler({
      ...request,
      title,
      description,
      confirmText: request.confirmText ?? "下载",
      cancelText: request.cancelText ?? "取消",
    });
  }

  return window.confirm(`${title}\n\n${description}`);
}

/** 在全局开关开启时先确认，再执行实际下载逻辑 */
export async function runGuardedDownload(
  action: () => void | Promise<void>,
  request: DownloadConfirmRequest = {},
): Promise<boolean> {
  const ok = await confirmBeforeDownload(request);
  if (!ok) return false;
  await action();
  return true;
}
