import {
  lazyPublicRouteWithPreload as lazyWithPreload,
  lazyPublicRouteWithStyles,
} from "@/routes/lazyWithPreload";
export type { PreloadableLazy } from "@/routes/lazyWithPreload";
export {
  Cart,
  Categories,
  NotFound,
  ProductDetail,
  Profile,
  PromotionDetail,
  Promotions,
  Search,
  StoreHomeV2,
  SupportDownload,
  TikTokLanding,
} from "@/routes/publicFrontLazyPages";

let notificationsRouteStylesPromise: Promise<unknown> | undefined;

function preloadNotificationsRouteStyles() {
  notificationsRouteStylesPromise ??= Promise.all([
    import("@/styles/notifications-tailwind.css"),
    import("@/styles/storefront-route-primitives.css"),
  ]).catch((error: unknown) => {
    notificationsRouteStylesPromise = undefined;
    throw error;
  });
  return notificationsRouteStylesPromise;
}

export const Login = lazyWithPreload(() => import("@/modules/public/pages/auth/Login"));
export const ForgotPassword = lazyWithPreload(() => import("@/modules/public/pages/auth/ForgotPassword"));
export const BindWechatPhone = lazyWithPreload(() => import("@/modules/public/pages/auth/BindWechatPhone"));

export const NewArrivals = lazyWithPreload(() => import("@/modules/public/pages/product/NewArrivals"));
export const Deals = lazyWithPreload(() => import("@/modules/public/pages/marketing/Deals"));

export const Checkout = lazyWithPreload(() => import("@/modules/public/pages/order/Checkout"));
export const PaymentResult = lazyWithPreload(() => import("@/modules/public/pages/order/PaymentResult"));
export const Orders = lazyWithPreload(() => import("@/modules/public/pages/order/Orders"));
export const OrderDetail = lazyWithPreload(() => import("@/modules/public/pages/order/OrderDetail"));
export const OrderLogistics = lazyWithPreload(() => import("@/modules/public/pages/order/OrderLogistics"));
export const Returns = lazyWithPreload(() => import("@/modules/public/pages/order/Returns"));
export const ReturnDetail = lazyWithPreload(() => import("@/modules/public/pages/order/ReturnDetail"));
export const PendingReviews = lazyWithPreload(() => import("@/modules/public/pages/review/PendingReviews"));

export const Feedback = lazyWithPreload(() => import("@/modules/public/pages/user/Feedback"));
export const MemberBenefits = lazyWithPreload(() => import("@/modules/public/pages/user/MemberBenefits"));
export const Settings = lazyWithPreload(() => import("@/modules/public/pages/user/Settings"));
export const AddressManage = lazyWithPreload(() => import("@/modules/public/pages/user/AddressManage"));
export const Favorites = lazyWithPreload(() => import("@/modules/public/pages/user/Favorites"));
export const History = lazyWithPreload(() => import("@/modules/public/pages/user/History"));
export const Notifications = lazyPublicRouteWithStyles(
  () => import("@/modules/public/pages/user/Notifications"),
  preloadNotificationsRouteStyles,
);
export const Coupons = lazyWithPreload(() => import("@/modules/public/pages/user/Coupons"));
export const Points = lazyWithPreload(() => import("@/modules/public/pages/user/Points"));
export const PointsGiftShop = lazyWithPreload(() => import("@/modules/public/pages/user/PointsGiftShop"));
export const Rewards = lazyWithPreload(() => import("@/modules/public/pages/user/Rewards"));
export const Wallet = lazyWithPreload(() => import("@/modules/public/pages/user/Wallet"));
export const Invite = lazyWithPreload(() => import("@/modules/public/pages/user/Invite"));

export const Help = lazyWithPreload(() => import("@/modules/public/pages/content/Help"));
export const About = lazyWithPreload(() => import("@/modules/public/pages/content/About"));
export const ContentCmsPage = lazyWithPreload(() => import("@/modules/public/pages/content/ContentCmsPage"));
export const Delivery = lazyWithPreload(() => import("@/modules/public/pages/content/Delivery"));
export const FeatureStatus = lazyWithPreload(() => import("@/modules/public/pages/content/FeatureStatus"));
export const ClientDesignSystem = lazyWithPreload(() => import("@/modules/public/pages/design/ClientDesignSystem").then((module) => ({ default: module.ClientDesignSystem })));
export const ClientCouponDetailDesign = lazyWithPreload(() => import("@/modules/public/pages/design/ClientDesignSystem").then((module) => ({ default: module.ClientCouponDetailDesign })));
export const ClientShareDetailDesign = lazyWithPreload(() => import("@/modules/public/pages/design/ClientDesignSystem").then((module) => ({ default: module.ClientShareDetailDesign })));
export const ClientStatesDesign = lazyWithPreload(() => import("@/modules/public/pages/design/ClientDesignSystem").then((module) => ({ default: module.ClientStatesDesign })));
