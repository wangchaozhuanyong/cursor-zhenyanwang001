import { useMemo } from "react";

const STORAGE_KEY = "home_tracking_session_id";

/** Stable session id for homepage module engagement (new arrivals, etc.). */
export function useHomeTrackingSessionId(): string {
  return useMemo(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = `s_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  }, []);
}
