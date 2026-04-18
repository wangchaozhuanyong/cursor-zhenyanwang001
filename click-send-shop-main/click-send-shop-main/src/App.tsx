import { lazy, Suspense, useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import AdminLayout from "./layouts/AdminLayout";
import FrontLayout from "./layouts/FrontLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";

const Index = lazy(() => import("./pages/Index"));
const Categories = lazy(() => import("./pages/Categories"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Invite = lazy(() => import("./pages/Invite"));
const Points = lazy(() => import("./pages/Points"));
const Rewards = lazy(() => import("./pages/Rewards"));
const AddressManage = lazy(() => import("./pages/AddressManage"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Search = lazy(() => import("./pages/Search"));
const Login = lazy(() => import("./pages/Login"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Help = lazy(() => import("./pages/Help"));
const About = lazy(() => import("./pages/About"));
const Returns = lazy(() => import("./pages/Returns"));
const History = lazy(() => import("./pages/History"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminProductTags = lazy(() => import("./pages/admin/AdminProductTags"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminInvites = lazy(() => import("./pages/admin/AdminInvites"));
const AdminPointsRules = lazy(() => import("./pages/admin/AdminPointsRules"));
const AdminReferralRules = lazy(() => import("./pages/admin/AdminReferralRules"));
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminCouponForm = lazy(() => import("./pages/admin/AdminCouponForm"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminAccount = lazy(() => import("./pages/admin/AdminAccount"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminCouponRecords = lazy(() => import("./pages/admin/AdminCouponRecords"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminAccounts = lazy(() => import("./pages/admin/AdminAccounts"));
const AdminRecycleBin = lazy(() => import("./pages/admin/AdminRecycleBin"));
const AdminExportCenter = lazy(() => import("./pages/admin/AdminExportCenter"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 size={28} className="animate-spin text-gold" />
    </div>
  );
}

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
          <AuthTokenSync />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Pages with bottom nav */}
              <Route element={<FrontLayout />}>
              <Route path="/" element={<Index />} />
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
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="invites" element={<AdminInvites />} />
                <Route path="settings/points" element={<AdminPointsRules />} />
                <Route path="settings/referral" element={<AdminReferralRules />} />
                <Route path="settings/site" element={<AdminSiteSettings />} />
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
