import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { POINTS_GIFT_REDEEM_CLIENT_ENABLED } from "@/constants/pointsClientFeatures";
import { areClientDesignRoutesEnabled } from "@/utils/clientDesignRoutes";
import {
  About,
  AddressManage,
  BindWechatPhone,
  Checkout,
  ClientCouponDetailDesign,
  ClientDesignSystem,
  ClientShareDetailDesign,
  ClientStatesDesign,
  ContentCmsPage,
  Coupons,
  Delivery,
  Favorites,
  FeatureStatus,
  Feedback,
  ForgotPassword,
  Help,
  History,
  Invite,
  Login,
  MemberBenefits,
  NotFound,
  Notifications,
  OrderDetail,
  OrderLogistics,
  Orders,
  PaymentResult,
  PendingReviews,
  Points,
  PointsGiftShop,
  ReturnDetail,
  Returns,
  Rewards,
  Settings,
  SupportDownload,
  Wallet,
} from "@/routes/publicLazyPages";
import { CapabilityRoute, type PublicRouteCapabilities } from "@/routes/publicCapabilityRoute";
import { LoyaltyRouteGuard } from "@/routes/publicRouteGuards";
import { publicNavigatePath } from "@/routes/publicRoutePaths";

export type PublicStandaloneRouteKey =
  | "about"
  | "address"
  | "bind-phone"
  | "checkout"
  | "client-design-coupon-detail"
  | "client-design-share-detail"
  | "client-design-states"
  | "client-design-system"
  | "content"
  | "coupons"
  | "delivery"
  | "favorites"
  | "feature-status"
  | "feedback"
  | "forgot"
  | "help"
  | "history"
  | "install"
  | "invite"
  | "login"
  | "member-benefits"
  | "notifications"
  | "order-detail"
  | "order-logistics"
  | "orders"
  | "payment-result"
  | "pending-reviews"
  | "points"
  | "points-gifts"
  | "return-detail"
  | "returns"
  | "rewards"
  | "settings"
  | "wallet";

type PublicStandaloneRouteElementProps = {
  route: PublicStandaloneRouteKey;
  capabilities: PublicRouteCapabilities;
  localized?: boolean;
};

export default function PublicStandaloneRouteElement({
  route,
  capabilities,
  localized = false,
}: PublicStandaloneRouteElementProps) {
  switch (route) {
    case "login":
      return <Login />;
    case "forgot":
      return <ForgotPassword />;
    case "bind-phone":
      return <BindWechatPhone />;
    case "help":
      return <Help />;
    case "about":
      return <About />;
    case "delivery":
      return <Delivery />;
    case "feature-status":
      return <FeatureStatus />;
    case "feedback":
      return <Feedback />;
    case "favorites":
      return <Favorites />;
    case "install":
      return capabilities.customerServiceDownloadEnabled ? (
        <CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}>
          <SupportDownload installMode />
        </CapabilityRoute>
      ) : (
        <Navigate to={publicNavigatePath("/", localized)} replace />
      );
    case "content":
      return <ContentCmsPage />;
    case "checkout":
      return (
        <ProtectedRoute>
          <CapabilityRoute enabled={capabilities.mallEnabled}>
            <Checkout />
          </CapabilityRoute>
        </ProtectedRoute>
      );
    case "payment-result":
      return (
        <CapabilityRoute enabled={capabilities.mallEnabled}>
          <PaymentResult />
        </CapabilityRoute>
      );
    case "settings":
      return (
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      );
    case "member-benefits":
      return (
        <ProtectedRoute>
          <CapabilityRoute enabled={capabilities.memberLevelEnabled}>
            <MemberBenefits />
          </CapabilityRoute>
        </ProtectedRoute>
      );
    case "orders":
      return (
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      );
    case "order-logistics":
      return (
        <ProtectedRoute>
          <OrderLogistics />
        </ProtectedRoute>
      );
    case "order-detail":
      return (
        <ProtectedRoute>
          <OrderDetail />
        </ProtectedRoute>
      );
    case "invite":
      return (
        <ProtectedRoute>
          <LoyaltyRouteGuard feature="referral">
            <Invite />
          </LoyaltyRouteGuard>
        </ProtectedRoute>
      );
    case "points":
      return (
        <ProtectedRoute>
          <CapabilityRoute enabled={capabilities.pointsEnabled}>
            <LoyaltyRouteGuard feature="points">
              <Points />
            </LoyaltyRouteGuard>
          </CapabilityRoute>
        </ProtectedRoute>
      );
    case "points-gifts":
      return POINTS_GIFT_REDEEM_CLIENT_ENABLED ? (
        <ProtectedRoute>
          <CapabilityRoute enabled={capabilities.pointsEnabled}>
            <LoyaltyRouteGuard feature="points">
              <PointsGiftShop />
            </LoyaltyRouteGuard>
          </CapabilityRoute>
        </ProtectedRoute>
      ) : (
        <Navigate to={publicNavigatePath("/points", localized)} replace />
      );
    case "rewards":
      return (
        <ProtectedRoute>
          <LoyaltyRouteGuard feature="reward">
            <Rewards />
          </LoyaltyRouteGuard>
        </ProtectedRoute>
      );
    case "wallet":
      return (
        <ProtectedRoute>
          <Wallet />
        </ProtectedRoute>
      );
    case "address":
      return (
        <ProtectedRoute>
          <AddressManage />
        </ProtectedRoute>
      );
    case "coupons":
      return (
        <CapabilityRoute enabled={capabilities.couponEnabled}>
          <Coupons />
        </CapabilityRoute>
      );
    case "notifications":
      return (
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      );
    case "returns":
      return (
        <ProtectedRoute>
          <Returns />
        </ProtectedRoute>
      );
    case "return-detail":
      return (
        <ProtectedRoute>
          <ReturnDetail />
        </ProtectedRoute>
      );
    case "pending-reviews":
      return (
        <ProtectedRoute>
          <CapabilityRoute enabled={capabilities.reviewEnabled}>
            <PendingReviews />
          </CapabilityRoute>
        </ProtectedRoute>
      );
    case "history":
      return <History />;
    case "client-design-system":
      return areClientDesignRoutesEnabled() ? <ClientDesignSystem /> : <NotFound />;
    case "client-design-coupon-detail":
      return areClientDesignRoutesEnabled() ? <ClientCouponDetailDesign /> : <NotFound />;
    case "client-design-share-detail":
      return areClientDesignRoutesEnabled() ? <ClientShareDetailDesign /> : <NotFound />;
    case "client-design-states":
      return areClientDesignRoutesEnabled() ? <ClientStatesDesign /> : <NotFound />;
    default:
      return <NotFound />;
  }
}
