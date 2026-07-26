export function publicRoutePath(path: string, localized: boolean) {
  return localized ? path.replace(/^\//, "") : path;
}

export function publicNavigatePath(path: string, localized: boolean) {
  if (localized && path === "/") return ".";
  return localized ? path.replace(/^\//, "") : path;
}
