type AdminNavTitleItem = {
  label: string;
  path: string;
  children?: AdminNavTitleChild[];
};

type AdminNavTitleChild = {
  label: string;
  path?: string;
  children?: AdminNavTitleChild[];
};

const ACTIVITY_CREATE_TYPE_LABEL_KEYS: Record<string, string> = {
  flash_sale: "routeTitles.marketingNewFlashSale",
  full_reduction: "routeTitles.marketingNewFullReduction",
  coupon_activity: "routeTitles.marketingNewCouponActivity",
  points_bonus: "routeTitles.marketingNewPointsBonus",
  new_user_gift: "routeTitles.marketingNewUserGift",
  holiday: "routeTitles.marketingNewHoliday",
};

function getSearchParam(search: string | undefined, key: string): string {
  if (!search) return "";
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(key) || "";
}

function idSuffix(pathname: string, pattern: RegExp): string {
  const id = pathname.match(pattern)?.[1];
  return id ? ` #${decodeURIComponent(id)}` : "";
}

function childIsActive(pathname: string, childPath: string | undefined, parentPath: string): boolean {
  if (!childPath) return false;
  if (childPath === parentPath) {
    return pathname === childPath || pathname.startsWith(`${childPath}/`);
  }
  return pathname === childPath || pathname.startsWith(`${childPath}/`);
}

function resolveChildTitle(
  pathname: string,
  parent: AdminNavTitleItem,
  child: AdminNavTitleChild,
  parents: string[] = [],
): string | null {
  const labels = [...parents, child.label];
  if (child.children?.length) {
    for (const nested of child.children) {
      const nestedTitle = resolveChildTitle(pathname, parent, nested, labels);
      if (nestedTitle) return nestedTitle;
    }
  }
  if (childIsActive(pathname, child.path, parent.path)) {
    return `${parent.label} / ${labels.join(" / ")}`;
  }
  return null;
}

/** 隐藏/详情页三级顶栏标题（优先于侧栏二级匹配） */
export function getHiddenAdminHeaderTitle(
  pathname: string,
  t: (key: string) => string,
  search = "",
): string | null {
  const seg = (center: string, child: string, page: string) =>
    `${t(center)} / ${t(child)} / ${t(page)}`;

  if (pathname === "/admin/account") {
    return t("routeTitles.account");
  }

  if (pathname === "/admin/products/new") {
    return seg("nav.productCenter", "nav.productManage", "routeTitles.productNew");
  }
  if (/^\/admin\/products\/[^/]+$/.test(pathname)) {
    return `${seg("nav.productCenter", "nav.productManage", "routeTitles.productEdit")}${idSuffix(pathname, /^\/admin\/products\/([^/]+)$/)}`;
  }

  if (/^\/admin\/orders\/[^/]+$/.test(pathname) && !pathname.startsWith("/admin/orders/unfinished")) {
    return `${seg("nav.orderCenter", "nav.orderManage", "routeTitles.orderDetail")}${idSuffix(pathname, /^\/admin\/orders\/([^/]+)$/)}`;
  }

  if (/^\/admin\/users\/[^/]+$/.test(pathname)) {
    return `${seg("nav.customerCenter", "nav.userManage", "routeTitles.userDetail")}${idSuffix(pathname, /^\/admin\/users\/([^/]+)$/)}`;
  }

  if (/^\/admin\/notifications\/[^/]+$/.test(pathname)) {
    return `${seg("nav.notificationCenter", "nav.notifications", "routeTitles.notificationDetail")}${idSuffix(pathname, /^\/admin\/notifications\/([^/]+)$/)}`;
  }

  if (pathname === "/admin/marketing/coupons/new") {
    return seg("nav.marketingCenter", "nav.coupons", "routeTitles.couponNew");
  }
  if (
    /^\/admin\/marketing\/coupons\/[^/]+$/.test(pathname)
    && pathname !== "/admin/marketing/coupons/records"
  ) {
    return `${seg("nav.marketingCenter", "nav.coupons", "routeTitles.couponEdit")}${idSuffix(pathname, /^\/admin\/marketing\/coupons\/([^/]+)$/)}`;
  }

  if (pathname === "/admin/marketing/activities/new") {
    const copyFrom = getSearchParam(search, "copy_from");
    const type = getSearchParam(search, "type");
    const labelKey = copyFrom
      ? "routeTitles.marketingCopy"
      : ACTIVITY_CREATE_TYPE_LABEL_KEYS[type] || "routeTitles.marketingNewLeaf";
    return `${t("nav.marketingCenter")} / ${t("nav.activities")} / ${t(labelKey)}`;
  }
  if (/^\/admin\/marketing\/activities\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.match(/^\/admin\/marketing\/activities\/([^/]+)\/edit$/)?.[1];
    const suffix = id ? ` #${decodeURIComponent(id)}` : "";
    return `${seg("nav.marketingCenter", "nav.activities", "routeTitles.marketingEditLeaf")}${suffix}`;
  }

  if (/^\/admin\/monitoring\/anomalies\/[^/]+$/.test(pathname)) {
    return `${seg("nav.monitoringCenter", "nav.monitoringAnomalies", "routeTitles.monitoringAnomalyDetail")}${idSuffix(pathname, /^\/admin\/monitoring\/anomalies\/([^/]+)$/)}`;
  }

  return null;
}

/** 工作标签短标题：取面包屑最后一段，避免顶栏与页面重复占高 */
export function resolveAdminTabTitle(
  navItems: AdminNavTitleItem[],
  pathname: string,
  fallback: string,
  t: (key: string) => string,
  search = "",
): string {
  const hidden = getHiddenAdminHeaderTitle(pathname, t, search);
  if (hidden) {
    const parts = hidden.split(" / ").map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || hidden;
  }
  for (const item of navItems) {
    if (item.children?.length) {
      for (const child of item.children) {
        const childTitle = resolveChildTitle(pathname, item, child);
        if (childTitle) {
          const parts = childTitle.split(" / ").map((p) => p.trim()).filter(Boolean);
          return parts[parts.length - 1] || child.label;
        }
      }
    }
    if (pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path))) {
      return item.label;
    }
  }
  return fallback;
}
