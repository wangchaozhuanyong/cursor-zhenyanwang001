/** 触发浏览器保存文件（href 可为 blob: 或 data: URL） */
export function triggerBrowserFileDownload(href: string, filename: string): void {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function triggerBrowserBlobDownload(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    triggerBrowserFileDownload(url, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
