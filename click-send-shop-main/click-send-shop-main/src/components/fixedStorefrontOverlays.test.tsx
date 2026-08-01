import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DownloadConfirmProvider } from "./DownloadConfirmProvider";
import { confirmBeforeDownload } from "@/utils/downloadConfirm";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("fixed storefront global overlays", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    vi.restoreAllMocks();
  });

  const renderProvider = async (children: ReactNode = <main>商城内容</main>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<DownloadConfirmProvider>{children}</DownloadConfirmProvider>);
      await Promise.resolve();
    });
    return container;
  };

  it("uses the fixed compact download dialog and resolves the selected action", async () => {
    const view = await renderProvider();
    let decision: Promise<boolean> | undefined;

    await act(async () => {
      decision = confirmBeforeDownload({
        title: "下载发票",
        description: "发票将保存到本机。",
      });
      await Promise.resolve();
    });

    const dialog = view.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).toHaveClass("sf-fixed-download-confirm__panel");
    expect(dialog?.textContent).toContain("下载发票");
    expect(dialog?.querySelector(".sf-fixed-download-confirm__icon")).toBeInTheDocument();
    expect(dialog?.querySelectorAll(".sf-fixed-overlay-action")).toHaveLength(2);

    const confirmButton = Array.from(dialog?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("下载"),
    );
    await act(async () => {
      confirmButton?.click();
      await Promise.resolve();
    });

    await expect(decision).resolves.toBe(true);
    expect(view.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
