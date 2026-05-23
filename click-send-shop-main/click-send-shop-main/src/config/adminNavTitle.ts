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
    return seg("nav.productCenter", "nav.productManage", "routeTitles.productEdit");
  }

  if (/^\/admin\/orders\/[^/]+$/.test(pathname) && !pathname.startsWith("/admin/orders/unfinished")) {
    return seg("nav.orderCenter", "nav.orderManage", "routeTitles.orderDetail");
  }

  if (/^\/admin\/users\/[^/]+$/.test(pathname)) {
    return seg("nav.customerCenter", "nav.userManage", "routeTitles.userDetail");
  }

  if (/^\/admin\/notifications\/[^/]+$/.test(pathname)) {
    return seg("nav.notificationCenter", "nav.notifications", "routeTitles.notificationDetail");
  }

  if (pathname === "/admin/marketing/coupons/new") {
    return seg("nav.marketingCenter", "nav.coupons", "routeTitles.couponNew");
  }
  if (
    /^\/admin\/marketing\/coupons\/[^/]+$/.test(pathname)
    && pathname !== "/admin/marketing/coupons/records"
  ) {
    return seg("nav.marketingCenter", "nav.coupons", "routeTitles.couponEdit");
  }

  if (pathname === "/admin/marketing/activities/new") {
    return seg("nav.marketingCenter", "nav.activities", "routeTitles.marketingNewLeaf");
  }
  if (/^\/admin\/marketing\/activities\/[^/]+\/edit$/.test(pathname)) {
    return seg("nav.marketingCenter", "nav.activities", "routeTitles.marketingEditLeaf");
  }

  return null;
}

/** 顶栏标题：一级 / 二级（或隐藏页三级），与侧栏命名一致 */
export function resolveAdminHeaderTitle(
  navItems: AdminNavTitleItem[],
  pathname: string,
  fallback: string,
): string {
  for (const item of navItems) {
    if (item.children?.length) {
      for (const child of item.children) {
        const childTitle = resolveChildTitle(pathname, item, child);
        if (childTitle) return childTitle;
      }
    }
    if (pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path))) {
      return item.label;
    }
  }
  return fallback;
}
