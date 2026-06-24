const LOCAL_DESIGN_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function shouldEnableClientDesignRoutes(options: { isDev: boolean; hostname?: string | null }) {
  if (options.isDev) return true;
  return !!options.hostname && LOCAL_DESIGN_HOSTS.has(options.hostname);
}

export function areClientDesignRoutesEnabled() {
  return shouldEnableClientDesignRoutes({
    isDev: import.meta.env.DEV,
    hostname: typeof window === "undefined" ? null : window.location.hostname,
  });
}
