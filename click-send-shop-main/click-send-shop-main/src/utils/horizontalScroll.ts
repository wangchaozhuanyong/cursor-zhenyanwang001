export type CenteredScrollInput = {
  containerScrollLeft: number;
  containerClientWidth: number;
  containerScrollWidth: number;
  containerLeft: number;
  itemLeft: number;
  itemWidth: number;
};

export function getCenteredScrollLeft(input: CenteredScrollInput) {
  const centeredLeft =
    input.containerScrollLeft
    + input.itemLeft
    - input.containerLeft
    - (input.containerClientWidth - input.itemWidth) / 2;
  const maxLeft = Math.max(0, input.containerScrollWidth - input.containerClientWidth);
  return Math.min(Math.max(0, centeredLeft), maxLeft);
}

export function getMotionSafeScrollBehavior(behavior: ScrollBehavior = "smooth"): ScrollBehavior {
  if (
    behavior === "smooth"
    && typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }
  return behavior;
}

export function scrollElementToHorizontalCenter(
  container: HTMLElement | null | undefined,
  item: HTMLElement | null | undefined,
  behavior: ScrollBehavior = "smooth",
) {
  if (!container || !item) return;
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  container.scrollTo({
    left: getCenteredScrollLeft({
      containerScrollLeft: container.scrollLeft,
      containerClientWidth: container.clientWidth,
      containerScrollWidth: container.scrollWidth,
      containerLeft: containerRect.left,
      itemLeft: itemRect.left,
      itemWidth: item.clientWidth,
    }),
    behavior: getMotionSafeScrollBehavior(behavior),
  });
}
