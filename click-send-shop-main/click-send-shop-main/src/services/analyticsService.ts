import { trackAnalyticsEvent, type AnalyticsEventPayload } from "@/api/modules/analytics";

function getSessionId() {
  const key = "analytics_session_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

function getAnonymousId() {
  const key = "analytics_anonymous_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

export async function trackEvent(payload: AnalyticsEventPayload): Promise<void> {
  try {
    await trackAnalyticsEvent({
      ...payload,
      page: payload.page || window.location.pathname,
      session_id: payload.session_id || getSessionId(),
      anonymous_id: payload.anonymous_id || getAnonymousId(),
    });
  } catch {
    // keep analytics non-blocking
  }
}

