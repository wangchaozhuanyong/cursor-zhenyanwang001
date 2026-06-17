import { lazy } from "react";

export type PreloadableLazy<T extends React.ComponentType<never>> = T & { preload?: () => Promise<unknown> };
export function lazyWithPreload<T extends React.ComponentType<never>>(factory: () => Promise<{ default: T }>) {
  const Component = lazy(factory) as PreloadableLazy<T>;
  Component.preload = factory;
  return Component;
}

export const StoreHomeV2 = lazyWithPreload(() => import("@/modules/storefront-v2/home/StoreHomeV2"));
export const Login = lazyWithPreload(() => import("@/modules/public/pages/auth/Login"));
export const ForgotPassword = lazyWithPreload(() => import("@/modules/public/pages/auth/ForgotPassword"));
export const BindWechatPhone = lazyWithPreload(() => import("@/modules/public/pages/auth/BindWechatPhone"));

export const Categories = lazyWithPreload(() => import("@/modules/public/pages/product/Categories"));
export const ProductDetail = lazyWithPreload(() => import("@/modules/public/pages/product/ProductDetail"));
export const NewArrivals = lazyWithPreload(() => import("@/modules/public/pages/product/NewArrivals"));
export const Search = lazyWithPreload(() => import("@/modules/public/pages/product/Search"));
export const Deals = lazyWithPreload(() => import("@/modules/public/pages/marketing/Deals"));
export const Promotions = lazyWithPreload(() => import("@/modules/public/pages/promotion/Promotions"));
export const PromotionDetail = lazyWithPreload(() => import("@/modules/public/pages/promotion/PromotionDetail"));

export const Cart = lazyWithPreload(() => import("@/modules/public/pages/cart/Cart"));

export const Checkout = lazyWithPreload(() => import("@/modules/public/pages/order/Checkout"));
export const PaymentResult = lazyWithPreload(() => import("@/modules/public/pages/order/PaymentResult"));
export const Orders = lazyWithPreload(() => import("@/modules/public/pages/order/Orders"));
export const OrderDetail = lazyWithPreload(() => import("@/modules/public/pages/order/OrderDetail"));
export const OrderLogistics = lazyWithPreload(() => import("@/modules/public/pages/order/OrderLogistics"));
export const Returns = lazyWithPreload(() => import("@/modules/public/pages/order/Returns"));
export const ReturnDetail = lazyWithPreload(() => import("@/modules/public/pages/order/ReturnDetail"));
export const PendingReviews = lazyWithPreload(() => import("@/modules/public/pages/review/PendingReviews"));

export const Profile = lazyWithPreload(() => import("@/modules/public/pages/user/Profile"));
export const Feedback = lazyWithPreload(() => import("@/modules/public/pages/user/Feedback"));
export const MemberBenefits = lazyWithPreload(() => import("@/modules/public/pages/user/MemberBenefits"));
export const Settings = lazyWithPreload(() => import("@/modules/public/pages/user/Settings"));
export const AddressManage = lazyWithPreload(() => import("@/modules/public/pages/user/AddressManage"));
export const Favorites = lazyWithPreload(() => import("@/modules/public/pages/user/Favorites"));
export const History = lazyWithPreload(() => import("@/modules/public/pages/user/History"));
export const Notifications = lazyWithPreload(() => import("@/modules/public/pages/user/Notifications"));
export const Coupons = lazyWithPreload(() => import("@/modules/public/pages/user/Coupons"));
export const Points = lazyWithPreload(() => import("@/modules/public/pages/user/Points"));
export const PointsGiftShop = lazyWithPreload(() => import("@/modules/public/pages/user/PointsGiftShop"));
export const Rewards = lazyWithPreload(() => import("@/modules/public/pages/user/Rewards"));
export const Wallet = lazyWithPreload(() => import("@/modules/public/pages/user/Wallet"));
export const Invite = lazyWithPreload(() => import("@/modules/public/pages/user/Invite"));

export const Help = lazyWithPreload(() => import("@/modules/public/pages/content/Help"));
export const About = lazyWithPreload(() => import("@/modules/public/pages/content/About"));
export const ContentCmsPage = lazyWithPreload(() => import("@/modules/public/pages/content/ContentCmsPage"));
export const SupportDownload = lazyWithPreload(() => import("@/modules/public/pages/content/SupportDownload"));
export const Delivery = lazyWithPreload(() => import("@/modules/public/pages/content/Delivery"));
export const FeatureStatus = lazyWithPreload(() => import("@/modules/public/pages/content/FeatureStatus"));
export const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

export const NotFound = lazy(() => import("@/modules/public/pages/error/NotFound"));
