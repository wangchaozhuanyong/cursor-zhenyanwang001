import { useEffect, useRef, useState } from "react";

type UseScrollRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  delayMs?: number;
};

export function useScrollReveal({
  threshold = 0.1,
  rootMargin = "0px 0px -5% 0px",
  once = true,
  delayMs = 0,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setRevealed(true);
      return;
    }

    let timer: number | null = null;
    let hasRevealed = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (!hasRevealed) {
            hasRevealed = true;
            timer = window.setTimeout(() => setRevealed(true), delayMs);
          }
          if (once) observer.unobserve(node);
          return;
        }

        if (!once) {
          hasRevealed = false;
          setRevealed(false);
        }
      },
      { threshold: [0, threshold, 1], root: null, rootMargin },
    );

    observer.observe(node);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [threshold, rootMargin, once, delayMs]);

  return { ref, revealed };
}
