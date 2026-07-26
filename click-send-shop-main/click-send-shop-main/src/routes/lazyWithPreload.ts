import { lazy, type ComponentType } from "react";

export type PreloadableLazy<T extends ComponentType<never>> = T & { preload?: () => Promise<unknown> };

export function lazyWithPreload<T extends ComponentType<never>>(factory: () => Promise<{ default: T }>) {
  let pending: Promise<{ default: T }> | undefined;
  const load = () => {
    pending ??= factory();
    return pending;
  };
  const Component = lazy(load) as PreloadableLazy<T>;
  Component.preload = load;
  return Component;
}

let publicRouteStylesPromise: Promise<unknown> | undefined;

export function preloadPublicRouteStyles() {
  publicRouteStylesPromise ??= Promise.all([
    import("@/styles/storefront-route-tailwind.css"),
    import("@/styles/storefront-route-primitives.css"),
  ]).catch((error: unknown) => {
      publicRouteStylesPromise = undefined;
      throw error;
    });
  return publicRouteStylesPromise;
}

export function lazyPublicRouteWithStyles<T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
  preloadStyles: () => Promise<unknown>,
) {
  return lazyWithPreload(async () => {
    const [, routeModule] = await Promise.all([
      preloadStyles(),
      factory(),
    ]);
    return routeModule;
  });
}

export function lazyPublicRouteWithPreload<T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazyPublicRouteWithStyles(factory, preloadPublicRouteStyles);
}
