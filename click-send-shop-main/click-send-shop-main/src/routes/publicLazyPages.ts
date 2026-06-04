import { lazy, type ComponentType } from "react";

export type PreloadableLazy<T extends React.ComponentType<never>> = T & { preload?: () => Promise<unknown> };
export function lazyWithPreload<T extends React.ComponentType<never>>(factory: () => Promise<{ default: T }>) {
  const Component = lazy(factory) as PreloadableLazy<T>;
  Component.preload = factory;
  return Component;
}

export const MemberHome = lazyWithPreload(() => import("@/modules/public/pages/home/MemberHome"));
export const GuestHome = lazyWithPreload(() => import("@/modules/public/pages/home/GuestHome"));
export const Login = lazy(() => import("@/modules/public/pages/auth/Login"));
export const BindWechatPhone = lazy(() => import("@/modules/public/pages/auth/BindWechatPhone"));

export const Categories = lazyWithPreload(() => import("@/modules/public/pages/product/Categories"));
export const ProductDetail = lazy(() => import("@/modules/public/pages/product/ProductDetail"));
export const NewArrivals = lazyWithPreload(() => import("@/modules/public/pages/product/NewArrivals"));
export const Search = lazyWithPreload(() => import("@/modules/public/pages/product/Search"));

export const Cart = lazyWithPreload(() => import("@/modules/public/pages/cart/Cart"));

export const Checkout = lazy(() => import("@/modules/public/pages/order/Checkout"));
export const Orders = lazyWithPreload(() => import("@/modules/public/pages/order/Orders"));
export const OrderDetail = lazy(() => import("@/modules/public/pages/order/OrderDetail"));
export const Returns = lazy(() => import("@/modules/public/pages/order/Returns"));
export const ReturnDetail = lazy(() => import("@/modules/public/pages/order/ReturnDetail"));
export const PendingReviews = lazy(() => import("@/modules/public/pages/review/PendingReviews"));

export const Profile = lazyWithPreload(() => import("@/modules/public/pages/user/Profile"));
export const Feedback = lazy(() => import("@/modules/public/pages/user/Feedback"));
export const MemberBenefits = lazy(() => import("@/modules/public/pages/user/MemberBenefits"));
export const Settings = lazy(() => import("@/modules/public/pages/user/Settings"));
export const AddressManage = lazy(() => import("@/modules/public/pages/user/AddressManage"));
export const Favorites = lazy(() => import("@/modules/public/pages/user/Favorites"));
export const History = lazy(() => import("@/modules/public/pages/user/History"));
export const Notifications = lazy(() => import("@/modules/public/pages/user/Notifications"));
export const Coupons = lazy(() => import("@/modules/public/pages/user/Coupons"));
export const Points = lazy(() => import("@/modules/public/pages/user/Points"));
export const PointsGiftShop = lazy(() => import("@/modules/public/pages/user/PointsGiftShop"));
export const Rewards = lazy(() => import("@/modules/public/pages/user/Rewards"));
export const Invite = lazy(() => import("@/modules/public/pages/user/Invite"));

export const Help = lazy(() => import("@/modules/public/pages/content/Help"));
export const About = lazy(() => import("@/modules/public/pages/content/About"));
export const ContentCmsPage = lazy(() => import("@/modules/public/pages/content/ContentCmsPage"));
export const SupportDownload = lazyWithPreload(() => import("@/modules/public/pages/content/SupportDownload"));
export const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

export const NotFound = lazy(() => import("@/modules/public/pages/error/NotFound"));
