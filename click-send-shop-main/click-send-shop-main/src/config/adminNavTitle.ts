type AdminNavTitleItem = {
  label: string;
  path: string;
  children?: { label: string; path: string }[];
};

function childIsActive(pathname: string, childPath: string, parentPath: string): boolean {
  if (childPath === parentPath) {
    return pathname === childPath || pathname.startsWith(`${childPath}/`);
  }
  return pathname === childPath || pathname.startsWith(`${childPath}/`);
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
        if (childIsActive(pathname, child.path, item.path)) {
          return `${item.label} / ${child.label}`;
        }
      }
    }
    if (pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path))) {
      return item.label;
    }
  }
  return fallback;
}
