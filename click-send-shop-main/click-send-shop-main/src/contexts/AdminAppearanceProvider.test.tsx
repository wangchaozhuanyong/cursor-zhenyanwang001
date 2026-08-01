import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  AdminAppearanceProvider,
  applyFixedAdminAppearance,
  useAdminAppearance,
} from "./AdminAppearanceProvider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function AppearanceProbe() {
  const { mode, toggleMode } = useAdminAppearance();
  return (
    <button type="button" data-testid="appearance-probe" onClick={toggleMode}>
      {mode}
    </button>
  );
}

describe("AdminAppearanceProvider", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
    window.localStorage.removeItem("admin_appearance_mode");
    applyFixedAdminAppearance(document.documentElement, "light");
  });

  async function renderProvider() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <AdminAppearanceProvider>
          <AppearanceProbe />
        </AdminAppearanceProvider>,
      );
    });
  }

  it("starts from the fixed light appearance without client skin attributes", async () => {
    document.documentElement.setAttribute("data-theme-skin-id", "legacy-skin");
    document.documentElement.setAttribute("data-client-design-style", "legacy");

    await renderProvider();

    expect(container).toHaveTextContent("light");
    expect(document.documentElement).toHaveAttribute("data-admin-appearance", "light");
    expect(document.documentElement).toHaveAttribute("data-admin-design", "fixed");
    expect(document.documentElement).not.toHaveAttribute("data-theme-skin-id");
    expect(document.documentElement).not.toHaveAttribute("data-client-design-style");
    expect(document.documentElement).not.toHaveAttribute("data-theme-admin-mode");
    expect(document.documentElement).not.toHaveAttribute("data-theme-ready");
    expect(document.documentElement).not.toHaveAttribute("data-theme-synced");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).not.toBe("");
  });

  it("persists and applies the independent dark appearance", async () => {
    await renderProvider();
    const button = container?.querySelector<HTMLButtonElement>("[data-testid='appearance-probe']");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-admin-appearance", "dark");
    expect(window.localStorage.getItem("admin_appearance_mode")).toBe("dark");
  });
});
