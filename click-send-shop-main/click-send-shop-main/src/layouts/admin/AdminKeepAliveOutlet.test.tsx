import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AdminKeepAliveOutlet from "./AdminKeepAliveOutlet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function StickyRoutePage({ label }: { label: string }) {
  const [mountedLabel] = useState(label);
  return <div data-testid="route-page">mounted:{mountedLabel}</div>;
}

function TestAdminLayout() {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate("/admin/settings/site")}>site</button>
      <button type="button" onClick={() => navigate("/admin/settings/features")}>features</button>
      <AdminKeepAliveOutlet />
    </div>
  );
}

describe("AdminKeepAliveOutlet", () => {
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

  it("remounts the right-side page when the admin pathname changes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/admin/settings/site"]}>
          <Routes>
            <Route path="/admin" element={<TestAdminLayout />}>
              <Route path="settings/site" element={<StickyRoutePage label="site" />} />
              <Route path="settings/features" element={<StickyRoutePage label="features" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.querySelector("[data-testid='route-page']")?.textContent).toBe("mounted:site");
    expect(container.querySelector("[data-admin-outlet-path]")?.getAttribute("data-admin-outlet-path")).toBe("/admin/settings/site");

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("button:nth-of-type(2)")?.click();
    });

    expect(container.querySelector("[data-testid='route-page']")?.textContent).toBe("mounted:features");
    expect(container.querySelector("[data-admin-outlet-path]")?.getAttribute("data-admin-outlet-path")).toBe("/admin/settings/features");
  });
});
