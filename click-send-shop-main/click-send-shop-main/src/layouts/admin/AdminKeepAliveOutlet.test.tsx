import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AdminKeepAliveOutlet from "./AdminKeepAliveOutlet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function StickyRoutePage({ label }: { label: string }) {
  const [mountedLabel] = useState(label);
  return <div data-testid="route-page">mounted:{mountedLabel}</div>;
}

function StickySearchPage() {
  const location = useLocation();
  const [mountedSearch] = useState(location.search);
  return <div data-testid="search-page">mounted:{mountedSearch}</div>;
}

function TestAdminLayout() {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate("/admin/settings/site")}>site</button>
      <button type="button" onClick={() => navigate("/admin/settings/features")}>features</button>
      <button type="button" onClick={() => navigate("/admin/marketing/activities/new?type=full_reduction")}>full reduction</button>
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

  it("remounts the right-side page when only the admin search changes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/admin/marketing/activities/new?type=flash_sale"]}>
          <Routes>
            <Route path="/admin" element={<TestAdminLayout />}>
              <Route path="marketing/activities/new" element={<StickySearchPage />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.querySelector("[data-testid='search-page']")?.textContent).toBe("mounted:?type=flash_sale");
    expect(container.querySelector("[data-admin-outlet-path]")?.getAttribute("data-admin-outlet-path")).toBe("/admin/marketing/activities/new?type=flash_sale");

    await act(async () => {
      container?.querySelector<HTMLButtonElement>("button:nth-of-type(3)")?.click();
    });

    expect(container.querySelector("[data-testid='search-page']")?.textContent).toBe("mounted:?type=full_reduction");
    expect(container.querySelector("[data-admin-outlet-path]")?.getAttribute("data-admin-outlet-path")).toBe("/admin/marketing/activities/new?type=full_reduction");
  });
});
