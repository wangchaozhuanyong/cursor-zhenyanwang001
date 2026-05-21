import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { isAdminAuthenticated } from "@/services/admin/accountService";

type AdminEventPayload = {
  type?: string;
  objectId?: string;
  summary?: string;
  at?: string;
};

function invalidateForAdminEvent(queryClient: ReturnType<typeof useQueryClient>, event: AdminEventPayload) {
  const type = String(event.type || "");
  if (type.startsWith("admin.event")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRoot() });
  }
  if (type.startsWith("order.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notificationsRoot() });
    if (event.objectId) void queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(event.objectId) });
    return;
  }
  if (type.startsWith("payment.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    return;
  }
  if (type.startsWith("return.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.returnsRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    return;
  }
  if (type.startsWith("inventory.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() });
    return;
  }
  if (type.startsWith("notification.")) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.notificationsRoot() });
  }
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
        invalidateForAdminEvent(queryClient, JSON.parse((message as MessageEvent).data) as AdminEventPayload);
      } catch {
        // Ignore malformed realtime frames; the polling fallback still keeps data fresh.
      }
    });

    source.onerror = () => {
      // Browser EventSource performs reconnects automatically; query refetch intervals are the fallback.
    };

    return () => {
      source.close();
      if (sourceRef.current === source) sourceRef.current = null;
    };
  }, [enabled, queryClient]);
}
