import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLocaleProvider } from "@/i18n/PublicLocaleProvider";
import StoreLanguageSwitcher from "./StoreLanguageSwitcher";

const capabilityState = vi.hoisted(() => ({
  ready: true,
  multilingual: false,
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => ({
    storefrontMultilingualEnabled: capabilityState.multilingual,
  }),
  useSiteCapabilitiesReady: () => capabilityState.ready,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("StoreLanguageSwitcher", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderSwitcher(initialPath = "/") {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={[initialPath]}>
          <PublicLocaleProvider>
            <StoreLanguageSwitcher />
          </PublicLocaleProvider>
        </MemoryRouter>,
      );
    });
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    capabilityState.ready = true;
    capabilityState.multilingual = false;
  });

  it("does not render on the Chinese-only default storefront", async () => {
    await renderSwitcher();

    expect(container?.textContent).toBe("");
  });

  it("renders only Chinese and English when storefront multilingual is enabled", async () => {
    capabilityState.multilingual = true;

    await renderSwitcher("/en/promotions");

    expect(container?.textContent).toContain("中");
    expect(container?.textContent).toContain("English");
    expect(container?.textContent).not.toContain("Bahasa");
    expect(container?.textContent).not.toContain("BM");
    expect(container?.querySelectorAll("a")).toHaveLength(2);
  });
});
