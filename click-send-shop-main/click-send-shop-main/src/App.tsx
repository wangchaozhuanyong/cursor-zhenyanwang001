import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouterLoadingBridge, TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";

import AdminLayout from "./layouts/AdminLayout";
import FrontLayout from "./layouts/FrontLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { syncLockedInviteCodeBySearch } from "@/utils/inviteReferral";

/* ───────── Public（前台）页面，按业务域 ───────── */
const MemberHome = lazy(() => import("@/modules/public/pages/home/MemberHome"));
const GuestHome = lazy(() => import("@/modules/public/pages/home/GuestHome"));
const Login = lazy(() => import("@/modules/public/pages/auth/Login"));

const Categories = lazy(() => import("@/modules/public/pages/product/Categories"));
const ProductDetail = lazy(() => import("@/modules/public/pages/product/ProductDetail"));
const Search = lazy(() => import("@/modules/public/pages/product/Search"));

const Cart = lazy(() => import("@/modules/public/pages/cart/Cart"));

const Checkout = lazy(() => import("@/modules/public/pages/order/Checkout"));
const Orders = lazy(() => import("@/modules/public/pages/order/Orders"));
const OrderDetail = lazy(() => import("@/modules/public/pages/order/OrderDetail"));
const Returns = lazy(() => import("@/modules/public/pages/order/Returns"));

const Profile = lazy(() => import("@/modules/public/pages/user/Profile"));
const Settings = lazy(() => import("@/modules/public/pages/user/Settings"));
const AddressManage = lazy(() => import("@/modules/public/pages/user/AddressManage"));
const Favorites = lazy(() => import("@/modules/public/pages/user/Favorites"));
const History = lazy(() => import("@/modules/public/pages/user/History"));
const Notifications = lazy(() => import("@/modules/public/pages/user/Notifications"));
const Coupons = lazy(() => import("@/modules/public/pages/user/Coupons"));
const Points = lazy(() => import("@/modules/public/pages/user/Points"));
const Rewards = lazy(() => import("@/modules/public/pages/user/Rewards"));
const Invite = lazy(() => import("@/modules/public/pages/user/Invite"));

const Help = lazy(() => import("@/modules/public/pages/content/Help"));
const About = lazy(() => import("@/modules/public/pages/content/About"));

const NotFound = lazy(() => import("@/modules/public/pages/error/NotFound"));

/* ───────── Admin（后台）页面，按业务域 ───────── */
const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
const AdminAccount = lazy(() => import("@/modules/admin/pages/auth/AdminAccount"));
const AdminAccounts = lazy(() => import("@/modules/admin/pages/auth/AdminAccounts"));

const Dashboard = lazy(() => import("@/modules/admin/pages/dashboard/Dashboard"));

const AdminProducts = lazy(() => import("@/modules/admin/pages/product/AdminProducts"));
const AdminProductForm = lazy(() => import("@/modules/admin/pages/product/AdminProductForm"));
const AdminCategories = lazy(() => import("@/modules/admin/pages/product/AdminCategories"));
const AdminProductTags = lazy(() => import("@/modules/admin/pages/product/AdminProductTags"));
const AdminBanners = lazy(() => import("@/modules/admin/pages/product/AdminBanners"));

const AdminOrders = lazy(() => import("@/modules/admin/pages/order/AdminOrders"));
const AdminOrderDetail = lazy(() => import("@/modules/admin/pages/order/AdminOrderDetail"));
const AdminReturns = lazy(() => import("@/modules/admin/pages/order/AdminReturns"));
const AdminShipping = lazy(() => import("@/modules/admin/pages/order/AdminShipping"));

const AdminUsers = lazy(() => import("@/modules/admin/pages/user/AdminUsers"));
const AdminUserDetail = lazy(() => import("@/modules/admin/pages/user/AdminUserDetail"));
const AdminInvites = lazy(() => import("@/modules/admin/pages/user/AdminInvites"));
const AdminRewardRecords = lazy(() => import("@/modules/admin/pages/user/AdminRewardRecords"));
const AdminPointsRecords = lazy(() => import("@/modules/admin/pages/user/AdminPointsRecords"));

const AdminCoupons = lazy(() => import("@/modules/admin/pages/coupon/AdminCoupons"));
const AdminCouponForm = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponForm"));
const AdminCouponRecords = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponRecords"));

const AdminReviews = lazy(() => import("@/modules/admin/pages/review/AdminReviews"));
const AdminNotifications = lazy(() => import("@/modules/admin/pages/notification/AdminNotifications"));

const AdminReports = lazy(() => import("@/modules/admin/pages/report/AdminReports"));
const AdminExportCenter = lazy(() => import("@/modules/admin/pages/report/AdminExportCenter"));

const AdminSiteSettings = lazy(() => import("@/modules/admin/pages/settings/AdminSiteSettings"));
const AdminThemeSettings = lazy(() => import("@/modules/admin/pages/settings/AdminThemeSettings"));
const AdminContent = lazy(() => import("@/modules/admin/pages/settings/AdminContent"));

const AdminRoles = lazy(() => import("@/modules/admin/pages/rbac/AdminRoles"));

const AdminLogs = lazy(() => import("@/modules/admin/pages/system/AdminLogs"));
const AdminRecycleBin = lazy(() => import("@/modules/admin/pages/system/AdminRecycleBin"));

const AdminPaymentChannels = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentChannels"));
const AdminPaymentOrders = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentOrders"));
const AdminPaymentEvents = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentEvents"));
const AdminPaymentReconciliations = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentReconciliations"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** 持久化的 isAuthenticated 与 access_token 可能不一致（清缓存、多标签页等），启动时对齐 */
function AuthTokenSync() {
  useLayoutEffect(() => {
    if (!isLoggedIn()) {
      useAuthStore.setState({ isAuthenticated: false });
    }
  }, []);
  return null;
}

function SiteIdentitySync() {
  const siteInfo = useSiteInfo();

  useLayoutEffect(() => {
    const favicon = (siteInfo.faviconUrl || "").trim() || "/favicon.webp";
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']",
      ),
    );

    if (links.length === 0) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = favicon;
      document.head.appendChild(link);
      return;
    }

    links.forEach((link) => {
      link.href = favicon;
    });
  }, [siteInfo.faviconUrl]);

  return null;
}

function ReferralInviteSync() {
  const location = useLocation();
  useEffect(() => {
    syncLockedInviteCodeBySearch(location.search);
  }, [location.search]);
  return null;
}

function HomeRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasToken = isLoggedIn();
  return hasToken || isAuthenticated ? <MemberHome /> : <GuestHome />;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <TopProgressBar />
          <RouterLoadingBridge />
          <AuthTokenSync />
          <SiteIdentitySync />
          <ReferralInviteSync />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              {/* Pages with bottom nav */}
              <Route element={<FrontLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/search" element={<Search />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Public pages */}
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />

              {/* Protected pages (require login) */}
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/invite" element={<ProtectedRoute><Invite /></ProtectedRoute>} />
              <Route path="/points" element={<ProtectedRoute><Points /></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
              <Route path="/address" element={<ProtectedRoute><AddressManage /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              {/* 与购物车/收藏一致：未登录可读本地持久化的浏览记录 */}
              <Route path="/history" element={<History />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<AdminProductForm />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="tags" element={<AdminProductTags />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="payments/channels" element={<AdminPaymentChannels />} />
                <Route path="payments/orders" element={<AdminPaymentOrders />} />
                <Route path="payments/events" element={<AdminPaymentEvents />} />
                <Route path="payments/reconciliations" element={<AdminPaymentReconciliations />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="invites" element={<AdminInvites />} />
                <Route path="rewards" element={<AdminRewardRecords />} />
                <Route path="points/records" element={<AdminPointsRecords />} />
                <Route path="settings/points" element={<Navigate to="/admin/points/records" replace />} />
                <Route path="settings/referral" element={<Navigate to="/admin/rewards" replace />} />
                <Route path="settings/site" element={<AdminSiteSettings />} />
                <Route path="settings/theme" element={<AdminThemeSettings />} />
                <Route path="settings/shipping" element={<AdminShipping />} />
                <Route path="settings/roles" element={<AdminRoles />} />
                <Route path="coupons" element={<AdminCoupons />} />
                {/* 静态路径须先于 :id，避免 /coupons/records 被当成 id=records */}
                <Route path="coupons/records" element={<AdminCouponRecords />} />
                <Route path="coupons/:id" element={<AdminCouponForm />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="returns" element={<AdminReturns />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="account" element={<AdminAccount />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="accounts" element={<AdminAccounts />} />
                <Route path="recycle-bin" element={<AdminRecycleBin />} />
                <Route path="exports" element={<AdminExportCenter />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="content" element={<AdminContent />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
