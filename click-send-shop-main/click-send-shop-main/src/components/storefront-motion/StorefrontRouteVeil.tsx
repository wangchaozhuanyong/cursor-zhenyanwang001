import { isProtectiveStorefrontTransition } from "./getStorefrontTransitionKind";
import { useStorefrontMotionState } from "./useStorefrontMotionState";

export default function StorefrontRouteVeil() {
  const motion = useStorefrontMotionState();
  const visible =
    motion.phase !== "idle" &&
    motion.phase !== "error" &&
    isProtectiveStorefrontTransition(motion.transitionKind);

  if (!visible) return null;

  return (
    <div className="sf-motion-route-veil" role="status" aria-live="polite" aria-label="正在准备安全页面">
      <span className="sf-motion-route-veil__line" aria-hidden="true" />
    </div>
  );
}
