import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { isAdminAuthenticated } from "@/services/admin/accountService";

type AdminEventPayload = {
  type?: string;
  objectId?: string;
  summary?: string;
  eventType?: string;
  at?: string;
};

type AdminRealtimeMode = "sse" | "polling" | "error";

type AdminRealtimeStatus = {
  connected: boolean;
  mode: AdminRealtimeMode;
  lastRealtimeAt: string;
};

const realtimeListeners = new Set<() => void>();
let realtimeStatus: AdminRealtimeStatus = {
  connected: false,
  mode: "polling",
  lastRealtimeAt: "",
};

function setRealtimeStatus(patch: Partial<AdminRealtimeStatus>) {
  realtimeStatus = { ...realtimeStatus, ...patch };
  realtimeListeners.forEach((listener) => listener());
}

function subscribeRealtimeStatus(listener: () => void) {
  realtimeListeners.add(listener);
  return () => realtimeListeners.delete(listener);
}

function getRealtimeStatusSnapshot() {
  return realtimeStatus;
}

function invalidateBusinessDomain(
  queryClient: ReturnType<typeof useQueryClient>,
  type: string,
  objectId?: string,
  options: { toastOrderCreated?: boolean } = {},
) {
  if (type.startsWith("order.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notificationsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.usersRoot() });
    if (objectId) void queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(objectId) });
    if (type === "order.created" && options.toastOrderCreated !== false) {
      toast.info("有新订单，列表已自动更新");
    }
    return;
  }
  if (type.startsWith("payment.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.usersRoot() });
    return;
  }
  if (type.startsWith("return.") || type.startsWith("refund.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.returnsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    if (objectId) void queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(objectId) });
    return;
  }
  if (type.startsWith("inventory.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    return;
  }
  if (type.startsWith("user.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.usersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    return;
  }
  if (type.startsWith("notification.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notificationsRoot() });
  }
}

function invalidateForAdminEvent(queryClient: ReturnType<typeof useQueryClient>, event: AdminEventPayload) {
  const type = String(event.type || "");
  if (type.startsWith("admin.event")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
    if (event.eventType) {
      invalidateBusinessDomain(queryClient, String(event.eventType), event.objectId, { toastOrderCreated: false });
    }
    return;
  }
  invalidateBusinessDomain(queryClient, type, event.objectId);
}

export function useAdminEvents(enabled = true) {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !isAdminAuthenticated()) return undefined;
    const source = new EventSource("/api/admin/events", { withCredentials: true });
    sourceRef.current = source;

    source.addEventListener("admin-event", (message) => {
      try {
        setRealtimeStatus({ connected: true, mode: "sse", lastRealtimeAt: new Date().toISOString() });
        invalidateForAdminEvent(queryClient, JSON.parse((message as MessageEvent).data) as AdminEventPayload);
      } catch {
        // Ignore malformed realtime frames; the polling fallback still keeps data fresh.
      }
    });

    source.addEventListener("connected", () => {
      setRealtimeStatus({ connected: true, mode: "sse", lastRealtimeAt: new Date().toISOString() });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    });

    source.addEventListener("heartbeat", () => {
      setRealtimeStatus({ connected: true, mode: "sse", lastRealtimeAt: new Date().toISOString() });
    });

    source.onerror = () => {
      setRealtimeStatus({ connected: false, mode: "polling" });
    };

    return () => {
      source.close();
      if (sourceRef.current === source) sourceRef.current = null;
      setRealtimeStatus({ connected: false, mode: "polling" });
    };
  }, [enabled, queryClient]);
}

export function useAdminRealtimeStatus() {
  return useSyncExternalStore(
    subscribeRealtimeStatus,
    getRealtimeStatusSnapshot,
    getRealtimeStatusSnapshot,
  );
}
