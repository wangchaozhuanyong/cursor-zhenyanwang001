import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreSearchLauncher } from "./StoreSearchDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixedStorefrontCss = fs.readFileSync(path.join(currentDir, "../../styles/fixed-storefront.css"), "utf8");

describe("StoreSearchLauncher", () => {
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
  });

  it("keeps the desktop header launcher accessible and clickable", async () => {
    const onClick = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <StoreSearchLauncher
          placeholder="搜索商品、服务、优惠券"
          className="sf-next-header-search-launcher"
          onClick={onClick}
        />,
      );
    });

    const button = container.querySelector("button");
    expect(button?.className).toContain("sf-next-store-search-launcher");
    expect(button?.className).toContain("sf-next-header-search-launcher");
    expect(button?.getAttribute("aria-label")).toBe("打开搜索：搜索商品、服务、优惠券");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the desktop launcher full-width with a single-line text column", () => {
    expect(fixedStorefrontCss).toMatch(
      /button\.sf-next-store-search-launcher\.sf-next-header-search-launcher\s*{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*grid-template-columns:\s*18px minmax\(0, 1fr\);/s,
    );
    expect(fixedStorefrontCss).toMatch(
      /\.sf-next-header-search-launcher span\s*{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s,
    );
  });
});
