import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLogin from "./AdminLogin";

vi.mock("@/hooks/useSiteInfo", () => ({
  useSiteInfo: () => ({
    siteName: "Demo Platform",
    logoUrl: "/uploads/platform-logo.webp",
    faviconUrl: "",
  }),
}));

vi.mock("@/modules/micro-interactions/components/FormFieldShake", () => {
  const Passthrough = ({ children }: { children: ReactNode }) => children;
  return {
    FormFieldShake: Passthrough,
    default: Passthrough,
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminLogin", () => {
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
    window.localStorage.clear();
  });

  it("展示站点设置里的平台标志", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/admin/login"]}>
          <AdminLogin />
        </MemoryRouter>,
      );
    });

    const logo = container.querySelector<HTMLImageElement>("img.admin-site-logo--lg");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/uploads/platform-logo.webp");
    expect(logo).toHaveAttribute("alt", "Demo Platform");
  });
});
