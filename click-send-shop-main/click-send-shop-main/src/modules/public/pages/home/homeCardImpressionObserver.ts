type HomeCardImpressionHandler = () => void;

const handlers = new WeakMap<Element, HomeCardImpressionHandler>();
let observer: IntersectionObserver | null = null;

function getObserver() {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
        const handler = handlers.get(entry.target);
        if (!handler) return;
        handler();
        handlers.delete(entry.target);
        observer?.unobserve(entry.target);
      });
    }, { threshold: [0.45] });
  }
  return observer;
}

export function observeHomeCardImpression(node: Element, onVisible: HomeCardImpressionHandler) {
  const sharedObserver = getObserver();
  if (!sharedObserver) {
    onVisible();
    return () => undefined;
  }

  handlers.set(node, onVisible);
  sharedObserver.observe(node);
  return () => {
    handlers.delete(node);
    sharedObserver.unobserve(node);
  };
}
