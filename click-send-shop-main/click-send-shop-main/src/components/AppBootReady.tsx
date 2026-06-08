import { useEffect } from "react";

let shellReadyDispatched = false;

export default function AppBootReady() {
  useEffect(() => {
    if (shellReadyDispatched) return;
    shellReadyDispatched = true;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("app:shell-ready"));
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return null;
}
