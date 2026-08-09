import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import StoreCategoryPrimaryNav from "./StoreCategoryPrimaryNav";
import StoreCategorySubcategorySelector from "./StoreCategorySubcategorySelector";
import type { Category } from "@/types/category";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: vi.fn(),
});

describe("store category navigation", () => {
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
    vi.clearAllMocks();
  });

  async function render(node: ReactNode) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(node);
    });
    return container;
  }

  it("keeps new and backend roots in the scroll track while all stays a fixed disclosure", async () => {
    const onAll = vi.fn();
    const onNew = vi.fn();
    const onRoot = vi.fn();
    const onExpandedChange = vi.fn();
    const expandedItems = [
      { id: "all", label: "全部商品", iconValue: "all", active: true, onClick: onAll },
      { id: "new", label: "新品", iconValue: "new", active: false, onClick: onNew },
      {
        id: "root-food",
        label: "食品饮料",
        iconValue: "/assets/category-food.webp",
        active: false,
        onClick: onRoot,
      },
    ];
    const view = await render(
      <StoreCategoryPrimaryNav
        loading={false}
        items={expandedItems.slice(1)}
        expandedItems={expandedItems}
        expanded={false}
        onExpandedChange={onExpandedChange}
      />,
    );

    const tabs = [...view.querySelectorAll<HTMLButtonElement>(".sf-next-category-primary-scroll [role='tab']")];
    expect(tabs.map((tab) => tab.textContent)).toEqual(["新品", "食品饮料"]);
    expect(view.querySelector(".sf-next-category-primary-scroll")).not.toHaveTextContent("全部商品");
    expect(tabs[0].querySelector("svg")).toBeInTheDocument();
    expect(tabs[1].querySelector("img")).toHaveAttribute("alt", "首页导航图标");

    const disclosure = view.querySelector<HTMLButtonElement>("[aria-label='展开全部一级分类']");
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      disclosure?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(onAll).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
    expect(onRoot).not.toHaveBeenCalled();
  });

  it("renders the expanded overview in order and closes after selection", async () => {
    const onAll = vi.fn();
    const onNew = vi.fn();
    const onRoot = vi.fn();
    const onExpandedChange = vi.fn();
    const expandedItems = [
      { id: "all", label: "全部商品", iconValue: "all", active: true, onClick: onAll },
      { id: "new", label: "新品", iconValue: "new", active: false, onClick: onNew },
      {
        id: "root-food",
        label: "食品饮料",
        iconValue: "/assets/category-food.webp",
        active: false,
        onClick: onRoot,
      },
    ];
    const view = await render(
      <StoreCategoryPrimaryNav
        loading={false}
        items={expandedItems.slice(1)}
        expandedItems={expandedItems}
        expanded
        onExpandedChange={onExpandedChange}
      />,
    );

    const panel = view.querySelector<HTMLElement>(".sf-next-category-primary-panel");
    const tabs = [...panel!.querySelectorAll<HTMLButtonElement>("[role='tab']")];
    expect(panel).not.toHaveAttribute("hidden");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["全部商品", "新品", "食品饮料"]);
    expect(tabs[0]).toHaveAttribute("aria-current", "page");
    expect(tabs[2]).toHaveAttribute("title", "食品饮料");

    await act(async () => {
      tabs[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onAll).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("renders stable skeletons while keeping system entries available", async () => {
    const view = await render(
      <StoreCategoryPrimaryNav
        loading
        items={[{ id: "new", label: "新品", iconValue: "new", active: false, onClick: vi.fn() }]}
        expandedItems={[
          { id: "all", label: "全部商品", iconValue: "all", active: true, onClick: vi.fn() },
          { id: "new", label: "新品", iconValue: "new", active: false, onClick: vi.fn() },
        ]}
        expanded
        onExpandedChange={vi.fn()}
      />,
    );
    expect(view.querySelectorAll(".sf-next-category-primary-item.is-loading")).toHaveLength(5);
    expect(view.querySelectorAll(".sf-next-category-primary-panel-item.is-loading")).toHaveLength(4);
    expect(view.querySelector(".sf-next-category-primary-scroll")).toHaveTextContent("新品");
    expect(view.querySelector(".sf-next-category-primary-panel")).toHaveTextContent("全部商品");
  });

  it("closes the overview with Escape and restores focus to the disclosure", async () => {
    const onExpandedChange = vi.fn();
    const view = await render(
      <StoreCategoryPrimaryNav
        loading={false}
        items={[]}
        expandedItems={[]}
        expanded
        onExpandedChange={onExpandedChange}
      />,
    );
    const disclosure = view.querySelector<HTMLButtonElement>("[aria-label='收起全部一级分类']")!;

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(disclosure);
  });

  it("shows only direct children in the secondary rail and tracks the active child", async () => {
    const onSelect = vi.fn();
    const subCategories: Category[] = [
      {
        id: "child-drinks",
        name: "咖啡饮品",
        parent_id: "root-food",
        children: [{ id: "grandchild-coffee", name: "咖啡豆", parent_id: "child-drinks" }],
      },
      { id: "child-snacks", name: "休闲零食", parent_id: "root-food", children: [] },
    ];
    const view = await render(
      <StoreCategorySubcategorySelector
        sectionLabel="食品饮料二级分类"
        activeCat="child-drinks"
        activeRootId="root-food"
        subCategories={subCategories}
        onSelect={onSelect}
      />,
    );

    const tabs = [...view.querySelectorAll<HTMLButtonElement>("[role='tab']")];
    expect(tabs.map((tab) => tab.textContent)).toEqual(["全部", "咖啡饮品", "休闲零食"]);
    expect(view).not.toHaveTextContent("咖啡豆");
    expect(tabs[1]).toHaveAttribute("aria-current", "page");
    expect(tabs[1]).toHaveAttribute("title", "咖啡饮品");

    await act(async () => {
      tabs[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith("root-food");
  });
});
