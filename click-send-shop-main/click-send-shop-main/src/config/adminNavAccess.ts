import {
  canPassAdminPathRule,
  getAdminRouteAccessRule,
  getFirstAllowedAdminRoutePath,
  type PathRule,
} from "@/config/adminRouteRegistry";

export type { PathRule };

export function getPathAccessRule(pathname: string): PathRule | null {
  return getAdminRouteAccessRule(pathname);
}

export function hasAdminPathAccessRule(pathname: string): boolean {
  return getPathAccessRule(pathname) !== null;
}

export function getFirstAllowedAdminPath(
  can: (c: string) => boolean,
  canAny: (codes: string[]) => boolean = (codes) => codes.some(can),
): string {
  return getFirstAllowedAdminRoutePath(can, canAny);
}

export function canAccessAdminPath(
  pathname: string,
  can: (c: string) => boolean,
  canAny: (codes: string[]) => boolean,
): boolean {
  const rule = getPathAccessRule(pathname);
  return rule ? canPassAdminPathRule(rule, can, canAny) : false;
}
