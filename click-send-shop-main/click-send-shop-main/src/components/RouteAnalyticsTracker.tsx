import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/services/analyticsService";

type PageSnapshot = {
  path: string;
  url: string;
  title: string;
  startedAt: number;
  maxScrollDepth: number;
};

function isTrackablePath(pathname: string) {
  return !pathname.startsWith("/admin");
}

function getScrollDepth() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const viewport = window.innerHeight || doc.clientHeight || 0;
  const fullHeight = Math.max(body.scrollHeight, doc.scrollHeight, body.offsetHeight, doc.offsetHeight, doc.clientHeight);
  if (fullHeight <= viewport) return 100;
  return Math.min(100, Math.round(((scrollTop + viewport) / fullHeight) * 100));
}

export default function RouteAnalyticsTracker() {
  const location = useLocation();
  const currentRef = useRef<PageSnapshot | null>(null);
  const sessionStartedRef = useRef(false);
  const leaveSentForPathRef = useRef("");

  useEffect(() => {
    const updateScrollDepth = () => {
      if (!currentRef.current) return;
      currentRef.current.maxScrollDepth = Math.max(currentRef.current.maxScrollDepth, getScrollDepth());
    };
    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("resize", updateScrollDepth);
    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("resize", updateScrollDepth);
    };
  }, []);

  useEffect(() => {
    const sendLeave = (beacon = false) => {
      const page = currentRef.current;
      if (!page || leaveSentForPathRef.current === page.url) return;
      leaveSentForPathRef.current = page.url;
      void trackEvent({
        event_type: "page_leave",
        module: "storefront",
        page: page.path,
        path: page.path,
        url: page.url,
        title: page.title,
        duration_ms: Math.max(0, Date.now() - page.startedAt),
        scroll_depth: Math.max(page.maxScrollDepth, getScrollDepth()),
      }, { beacon });
    };

    const onPageHide = () => sendLeave(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendLeave(true);
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sendLeave(true);
    };
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (!isTrackablePath(location.pathname)) {
      currentRef.current = null;
      return;
    }

    const previous = currentRef.current;
    if (previous && leaveSentForPathRef.current !== previous.url) {
      leaveSentForPathRef.current = previous.url;
      void trackEvent({
        event_type: "page_leave",
        module: "storefront",
        page: previous.path,
        path: previous.path,
        url: previous.url,
        title: previous.title,
        duration_ms: Math.max(0, Date.now() - previous.startedAt),
        scroll_depth: Math.max(previous.maxScrollDepth, getScrollDepth()),
      }, { beacon: true });
    }

    const snapshot: PageSnapshot = {
      path,
      url: window.location.href,
      title: document.title,
      startedAt: Date.now(),
      maxScrollDepth: getScrollDepth(),
    };
    currentRef.current = snapshot;
    leaveSentForPathRef.current = "";

    window.setTimeout(() => {
      if (currentRef.current?.url !== snapshot.url) return;
      snapshot.title = document.title;
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        void trackEvent({
          event_type: "session_start",
          module: "storefront",
          page: snapshot.path,
          path: snapshot.path,
          url: snapshot.url,
          title: snapshot.title,
        });
      }
      void trackEvent({
        event_type: "page_view",
        module: "storefront",
        page: snapshot.path,
        path: snapshot.path,
        url: snapshot.url,
        title: snapshot.title,
      });
    }, 120);
  }, [location.pathname, location.search]);

  return null;
}
