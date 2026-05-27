/**
 * 后台页面的“准实时刷新”查询参数集合。
 *
 * 约定：
 * - 仅用于后台（admin）界面；前台不要用高频轮询
 * - 避免把默认的 staleTime(5min) 带到需要即时性的页面
 */
export const adminRealtimeQueryOptions = {
  /** 订单详情：操作后希望尽快看到状态/金额变化 */
  order: {
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
} as const;

