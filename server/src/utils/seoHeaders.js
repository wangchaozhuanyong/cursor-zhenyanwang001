const ROBOTS_NOINDEX_NOFOLLOW = 'noindex, nofollow';
const ROBOTS_NOINDEX_FOLLOW = 'noindex, follow';

const HTML_NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, proxy-revalidate';

const PRIVATE_SPA_NOINDEX_NOFOLLOW_PATTERNS = [
  /^\/admin(\/|$)/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/cart(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/invite(\/|$)/,
  /^\/points(\/|$)/,
  /^\/rewards(\/|$)/,
  /^\/address(\/|$)/,
  /^\/coupons(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/returns(\/|$)/,
  /^\/reviews\/pending(\/|$)/,
  /^\/history(\/|$)/,
  /^\/favorites(\/|$)/,
];

const PRIVATE_SPA_NOINDEX_FOLLOW_PATTERNS = [
  /^\/search(\/|$)/,
];

function normalizePathname(pathname) {
  const raw = String(pathname || '/').split(/[?#]/, 1)[0] || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function resolvePublicSpaRobotsHeader(pathname) {
  const normalized = normalizePathname(pathname);
  if (PRIVATE_SPA_NOINDEX_NOFOLLOW_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return ROBOTS_NOINDEX_NOFOLLOW;
  }
  if (PRIVATE_SPA_NOINDEX_FOLLOW_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return ROBOTS_NOINDEX_FOLLOW;
  }
  return '';
}

function setNoStoreHtmlHeaders(res, options = {}) {
  res.setHeader('Cache-Control', HTML_NO_STORE_CACHE_CONTROL);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  if (options.robots) {
    res.setHeader('X-Robots-Tag', options.robots);
  }
}

module.exports = {
  HTML_NO_STORE_CACHE_CONTROL,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
  resolvePublicSpaRobotsHeader,
  setNoStoreHtmlHeaders,
};
