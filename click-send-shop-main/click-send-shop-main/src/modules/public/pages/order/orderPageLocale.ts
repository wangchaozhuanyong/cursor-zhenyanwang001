import type { PublicLocale } from "@/i18n/publicLocale";
import type { Order, OrderTab } from "@/types/order";
import { hasPendingReview } from "@/utils/orderBuyerStatus";

const ORDER_TABS_BY_LOCALE: Record<PublicLocale, Array<{ key: OrderTab; label: string }>> = {
  zh: [
    { key: "all", label: "全部" },
    { key: "pending_payment", label: "待付款" },
    { key: "paid", label: "待发货" },
    { key: "shipped", label: "待收货" },
    { key: "pending_review", label: "待评价" },
    { key: "completed", label: "已完成" },
    { key: "after_sale", label: "退款/售后" },
    { key: "cancelled", label: "已取消" },
  ],
  en: [
    { key: "all", label: "All" },
    { key: "pending_payment", label: "To pay" },
    { key: "paid", label: "To ship" },
    { key: "shipped", label: "To receive" },
    { key: "pending_review", label: "To review" },
    { key: "completed", label: "Completed" },
    { key: "after_sale", label: "Returns" },
    { key: "cancelled", label: "Cancelled" },
  ],
};

const ORDER_STEPS_BY_LOCALE: Record<PublicLocale, string[]> = {
  zh: ["待付款", "已付款", "已发货", "已完成"],
  en: ["To pay", "Paid", "Shipped", "Completed"],
};

export const ORDER_COPY: Record<PublicLocale, {
  accountTitle: string;
  tabsAria: string;
  searchPlaceholder: string;
  loading: string;
  loadFailed: string;
  retry: string;
  clearSearch: string;
  browse: string;
  emptyByTab: Record<OrderTab, string>;
  emptyKeyword: (keyword: string) => string;
  emptyKeywordDescription: string;
  emptyDescription: string;
  giftOrder: string;
  orderProducts: string;
  pointsUsed: string;
  defaultVariant: string;
  itemCount: (count: number) => string;
  paidTotal: string;
  more: string;
  support: string;
  cancelOrder: string;
  cancelHint: string;
  applying: string;
  receive: string;
  applyAfterSale: string;
  repurchase: string;
  viewAfterSale: string;
  viewLogistics: string;
  review: string;
  reviewProduct: string;
  reviewHint: string;
  addToCart: string;
  repurchaseHint: string;
  deleteOrder: string;
  deleteHint: string;
  noMoreActions: string;
  moreActions: string;
  loadingMore: string;
  loadMore: string;
  allLoaded: string;
  noLogistics: string;
  cartAdded: string;
  addCartFailed: string;
  cartReadded: string;
  repurchaseFailed: string;
  orderDeleted: string;
  deleteFailed: string;
  orderCancelled: string;
  cancelFailed: string;
  received: string;
  receiveFailed: string;
  detailTitle: string;
  notFound: string;
  unavailable: string;
  currentStatus: string;
  logistics: string;
  logisticsStatus: string;
  logisticsException: string;
  shortageFallback: string;
  productInfo: string;
  priceDetail: string;
  productAmount: string;
  discountAmount: string;
  pointsDeduction: string;
  rewardDeduction: string;
  shippingFee: string;
  freeShipping: string;
  paidAmount: string;
  orderInfo: string;
  orderNo: string;
  copiedOrderNo: string;
  createdAt: string;
  paymentMethod: string;
  orderType: string;
  pointsGiftRedeem: string;
  paymentTime: string;
  recipient: string;
  phone: string;
  address: string;
  buyerNote: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  deleteConfirmText: string;
  cancelConfirmTitle: string;
  cancelConfirmDescription: string;
  cancelConfirmText: string;
  cancelText: string;
  rethink: string;
  receiveConfirmTitle: string;
  receiveConfirmDescription: string;
  receiveConfirmText: string;
  reviewConfirmTitle: string;
  reviewConfirmDescription: string;
  reviewConfirmText: string;
  reviewLaterText: string;
  repurchaseConfirmTitle: string;
  repurchaseConfirmDescription: string;
  checkoutText: string;
}> = {
  zh: {
    accountTitle: "我的订单",
    tabsAria: "订单状态",
    searchPlaceholder: "搜索订单",
    loading: "加载中...",
    loadFailed: "订单加载失败",
    retry: "重试",
    clearSearch: "清空搜索",
    browse: "去逛逛",
    emptyByTab: {
      all: "暂无订单",
      pending_payment: "暂无待付款订单",
      paid: "暂无待发货订单",
      shipped: "暂无待收货订单",
      pending_review: "暂无待评价订单",
      completed: "暂无已完成订单",
      after_sale: "暂无退款/售后订单",
      cancelled: "暂无已取消订单",
    },
    emptyKeyword: (keyword) => `没有找到“${keyword}”相关订单`,
    emptyKeywordDescription: "可以清空关键词后重新查看订单。",
    emptyDescription: "下单后，订单状态会显示在这里。",
    giftOrder: "积分礼品",
    orderProducts: "订单商品",
    pointsUsed: "消耗积分",
    defaultVariant: "默认规格",
    itemCount: (count) => `共 ${count} 件商品`,
    paidTotal: "实付款",
    more: "更多",
    support: "联系客服",
    cancelOrder: "取消订单",
    cancelHint: "待付款订单可取消",
    applying: "处理中...",
    receive: "确认收货",
    applyAfterSale: "申请售后",
    repurchase: "再买一单",
    viewAfterSale: "查看售后",
    viewLogistics: "查看物流",
    review: "评价",
    reviewProduct: "评价商品",
    reviewHint: "去订单详情评价",
    addToCart: "加入购物车",
    repurchaseHint: "重新加入购物车并结算",
    deleteOrder: "删除订单",
    deleteHint: "仅从我的订单隐藏",
    noMoreActions: "当前订单暂无更多操作",
    moreActions: "更多操作",
    loadingMore: "加载中...",
    loadMore: "加载更多",
    allLoaded: "已全部加载",
    noLogistics: "暂无物流信息",
    cartAdded: "已加入购物车",
    addCartFailed: "加入购物车失败",
    cartReadded: "已为你重新加入购物车",
    repurchaseFailed: "再买一单失败",
    orderDeleted: "订单已删除",
    deleteFailed: "删除订单失败",
    orderCancelled: "订单已取消",
    cancelFailed: "取消失败",
    received: "已确认收货",
    receiveFailed: "确认收货失败",
    detailTitle: "订单详情",
    notFound: "订单不存在",
    unavailable: "该订单可能已删除，或当前链接不可用。",
    currentStatus: "当前状态",
    logistics: "物流",
    logisticsStatus: "物流状态",
    logisticsException: "物流出现异常，请联系客服确认。",
    shortageFallback: "部分商品因缺货已移除",
    productInfo: "商品信息",
    priceDetail: "价格明细",
    productAmount: "商品金额",
    discountAmount: "优惠金额",
    pointsDeduction: "积分抵扣",
    rewardDeduction: "返现抵扣",
    shippingFee: "运费",
    freeShipping: "包邮",
    paidAmount: "实付款",
    orderInfo: "订单信息",
    orderNo: "订单号",
    copiedOrderNo: "订单号已复制",
    createdAt: "下单时间",
    paymentMethod: "支付方式",
    orderType: "订单类型",
    pointsGiftRedeem: "积分礼品兑换",
    paymentTime: "支付时间",
    recipient: "收货人",
    phone: "手机号",
    address: "收货地址",
    buyerNote: "买家备注",
    deleteConfirmTitle: "删除订单",
    deleteConfirmDescription: "删除后该订单将不再显示在你的订单列表中，系统仍会保留必要记录用于售后、财务和审计。",
    deleteConfirmText: "删除",
    cancelConfirmTitle: "取消订单",
    cancelConfirmDescription: "取消后订单将关闭，如需购买请重新下单。",
    cancelConfirmText: "确认取消",
    cancelText: "取消",
    rethink: "再想想",
    receiveConfirmTitle: "确认收货",
    receiveConfirmDescription: "请确认已收到商品且无误。确认后将无法撤销。",
    receiveConfirmText: "确认收货",
    reviewConfirmTitle: "已确认收货",
    reviewConfirmDescription: "现在去评价商品吗？",
    reviewConfirmText: "去评价",
    reviewLaterText: "稍后再说",
    repurchaseConfirmTitle: "再买一单",
    repurchaseConfirmDescription: "将把该订单商品加入购物车并前往结算页，是否继续？",
    checkoutText: "前往结算",
  },
  en: {
    accountTitle: "My orders",
    tabsAria: "Order status",
    searchPlaceholder: "Search orders",
    loading: "Loading...",
    loadFailed: "Failed to load orders",
    retry: "Retry",
    clearSearch: "Clear search",
    browse: "Browse products",
    emptyByTab: {
      all: "No orders yet",
      pending_payment: "No orders to pay",
      paid: "No orders to ship",
      shipped: "No orders to receive",
      pending_review: "No orders to review",
      completed: "No completed orders",
      after_sale: "No return records",
      cancelled: "No cancelled orders",
    },
    emptyKeyword: (keyword) => `No orders found for "${keyword}"`,
    emptyKeywordDescription: "Clear the keyword to view orders again.",
    emptyDescription: "Your order status will appear here after checkout.",
    giftOrder: "Points gift",
    orderProducts: "Order items",
    pointsUsed: "Points used",
    defaultVariant: "Default option",
    itemCount: (count) => `${count} item${count === 1 ? "" : "s"}`,
    paidTotal: "Paid",
    more: "More",
    support: "Contact support",
    cancelOrder: "Cancel order",
    cancelHint: "Unpaid orders can be cancelled",
    applying: "Processing...",
    receive: "Confirm received",
    applyAfterSale: "Request service",
    repurchase: "Buy again",
    viewAfterSale: "View returns",
    viewLogistics: "View logistics",
    review: "Review",
    reviewProduct: "Review product",
    reviewHint: "Review in order details",
    addToCart: "Add to cart",
    repurchaseHint: "Add items again and checkout",
    deleteOrder: "Delete order",
    deleteHint: "Hide from My orders only",
    noMoreActions: "No more actions for this order",
    moreActions: "More actions",
    loadingMore: "Loading...",
    loadMore: "Load more",
    allLoaded: "All loaded",
    noLogistics: "No logistics info yet",
    cartAdded: "Added to cart",
    addCartFailed: "Failed to add to cart",
    cartReadded: "Items added to cart again",
    repurchaseFailed: "Buy again failed",
    orderDeleted: "Order deleted",
    deleteFailed: "Failed to delete order",
    orderCancelled: "Order cancelled",
    cancelFailed: "Cancellation failed",
    received: "Receipt confirmed",
    receiveFailed: "Failed to confirm receipt",
    detailTitle: "Order details",
    notFound: "Order not found",
    unavailable: "This order may have been deleted or the link is unavailable.",
    currentStatus: "Current status",
    logistics: "Logistics",
    logisticsStatus: "Logistics status",
    logisticsException: "A logistics issue occurred. Contact support to confirm.",
    shortageFallback: "Some items were removed due to shortage",
    productInfo: "Items",
    priceDetail: "Price details",
    productAmount: "Items amount",
    discountAmount: "Discount",
    pointsDeduction: "Points deduction",
    rewardDeduction: "Reward cash deduction",
    shippingFee: "Shipping fee",
    freeShipping: "Free shipping",
    paidAmount: "Paid",
    orderInfo: "Order information",
    orderNo: "Order no.",
    copiedOrderNo: "Order number copied",
    createdAt: "Order time",
    paymentMethod: "Payment method",
    orderType: "Order type",
    pointsGiftRedeem: "Points gift redemption",
    paymentTime: "Payment time",
    recipient: "Recipient",
    phone: "Phone",
    address: "Shipping address",
    buyerNote: "Buyer note",
    deleteConfirmTitle: "Delete order",
    deleteConfirmDescription: "This order will be hidden from your list. Required records remain for after-sales, finance, and audit.",
    deleteConfirmText: "Delete",
    cancelConfirmTitle: "Cancel order",
    cancelConfirmDescription: "The order will be closed. Place a new order if you still want to buy.",
    cancelConfirmText: "Confirm cancel",
    cancelText: "Cancel",
    rethink: "Not now",
    receiveConfirmTitle: "Confirm receipt",
    receiveConfirmDescription: "Confirm that you have received the items and everything is correct. This cannot be undone.",
    receiveConfirmText: "Confirm receipt",
    reviewConfirmTitle: "Receipt confirmed",
    reviewConfirmDescription: "Review the product now?",
    reviewConfirmText: "Review now",
    reviewLaterText: "Later",
    repurchaseConfirmTitle: "Buy again",
    repurchaseConfirmDescription: "Add this order's items to cart and go to checkout?",
    checkoutText: "Go to checkout",
  },};

export function getOrderTabs(locale: PublicLocale) {
  return ORDER_TABS_BY_LOCALE[locale] || ORDER_TABS_BY_LOCALE.zh;
}

export function getOrderStepLabels(locale: PublicLocale) {
  return ORDER_STEPS_BY_LOCALE[locale] || ORDER_STEPS_BY_LOCALE.zh;
}

export function getOrderCopy(locale: PublicLocale) {
  return ORDER_COPY[locale] || ORDER_COPY.zh;
}

export function getBuyerOrderStatusTextLocalized(order: Order, locale: PublicLocale) {
  if (locale === "zh") {
    if (order.order_type === "points_gift") {
      if (order.status === "pending") return "积分兑换待付款";
      if (order.status === "paid") return "积分兑换待发货";
      if (order.status === "shipped") return "积分兑换待收货";
      if (order.status === "completed") return "积分兑换已完成";
      if (order.status === "cancelled") return "积分兑换已取消";
    }
    if (order.status === "refunding") return "退款/售后处理中";
    if (order.status === "refunded") return "已退款";
    if (Number(order.active_return_count || 0) > 0) return "售后处理中";
    if (order.status === "pending") return "待付款";
    if (order.status === "paid") return "已付款，等待商家发货";
    if (order.status === "shipped") return "已发货，等待收货";
    if (order.status === "completed") return hasPendingReview(order) ? "待评价" : "已完成";
    if (Number(order.return_request_count || 0) > 0) return "售后已结案";
    if (order.status === "cancelled") return "已取消";
    return order.status;
  }

  const isGift = order.order_type === "points_gift";
  const en = {
    pendingGift: "Points redemption to pay",
    paidGift: "Points redemption to ship",
    shippedGift: "Points redemption to receive",
    completedGift: "Points redemption completed",
    cancelledGift: "Points redemption cancelled",
    refunding: "Return/refund processing",
    refunded: "Refunded",
    activeReturn: "After-sales processing",
    pending: "To pay",
    paid: "Paid, waiting for shipment",
    shipped: "Shipped, waiting for receipt",
    review: "To review",
    completed: "Completed",
    returnClosed: "After-sales closed",
    cancelled: "Cancelled",
  };
  const labels = en;
  if (isGift) {
    if (order.status === "pending") return labels.pendingGift;
    if (order.status === "paid") return labels.paidGift;
    if (order.status === "shipped") return labels.shippedGift;
    if (order.status === "completed") return labels.completedGift;
    if (order.status === "cancelled") return labels.cancelledGift;
  }
  if (order.status === "refunding") return labels.refunding;
  if (order.status === "refunded") return labels.refunded;
  if (Number(order.active_return_count || 0) > 0) return labels.activeReturn;
  if (order.status === "pending") return labels.pending;
  if (order.status === "paid") return labels.paid;
  if (order.status === "shipped") return labels.shipped;
  if (order.status === "completed") return hasPendingReview(order) ? labels.review : labels.completed;
  if (Number(order.return_request_count || 0) > 0) return labels.returnClosed;
  if (order.status === "cancelled") return labels.cancelled;
  return order.status;
}

export function labelOrderPaymentMethodLocalized(method: string | null | undefined, orderType: string | null | undefined, locale: PublicLocale) {
  const m = String(method || "").trim();
  const type = String(orderType || "").trim();
  if (locale === "zh") {
    if (type === "points_gift" && m === "points_gift") return "纯积分兑换";
    if (type === "points_gift" && m === "points_plus_cash") return "积分+现金";
    if (m === "points_gift") return "积分兑换";
    if (m === "points_plus_cash") return "积分+现金";
    if (m === "online") return "在线支付";
    if (m === "whatsapp") return "WhatsApp / 客服";
    if (m === "reward_wallet") return "返现钱包";
    return m || "-";
  }
  const en: Record<string, string> = {
    points_gift: "Points redemption",
    points_plus_cash: "Points + cash",
    online: "Online payment",
    whatsapp: "WhatsApp / support",
    reward_wallet: "Reward wallet",
  };
  if (type === "points_gift" && m === "points_gift") return "Points only";
  return en[m] || m || "-";
}

export function labelPendingPaymentActionLocalized(method: string | null | undefined, orderType: string | null | undefined, locale: PublicLocale) {
  const m = String(method || "").trim();
  const type = String(orderType || "").trim();
  if (locale === "zh") {
    if (type === "points_gift" && m === "points_plus_cash") return "支付差额";
    if (m === "online" || m === "points_plus_cash") return "在线支付";
    if (m === "reward_wallet") return "钱包支付";
    return "联系客服付款";
  }
  if (type === "points_gift" && m === "points_plus_cash") return "Pay balance";
  if (m === "online" || m === "points_plus_cash") return "Pay online";
  if (m === "reward_wallet") return "Pay with wallet";
  return "Contact support to pay";
}
