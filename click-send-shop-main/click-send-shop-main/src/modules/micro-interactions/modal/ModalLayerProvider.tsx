import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MODAL_BASE_Z, MODAL_Z_STEP } from "./modalBreakpoints";

export type ModalLayerInfo = {
  overlayZ: number;
  contentZ: number;
  isTop: boolean;
};

type ModalLayerContextValue = {
  register: (id: string, open: boolean) => void;
  getLayer: (id: string) => ModalLayerInfo;
};

const defaultLayer: ModalLayerInfo = {
  overlayZ: MODAL_BASE_Z,
  contentZ: MODAL_BASE_Z + 1,
  isTop: true,
};

const ModalLayerContext = createContext<ModalLayerContextValue | null>(null);

export function ModalLayerProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<string[]>([]);
  const [version, setVersion] = useState(0);

  const register = useCallback((id: string, open: boolean) => {
    const stack = stackRef.current;
    const idx = stack.indexOf(id);
    let changed = false;

    if (open && idx === -1) {
      stackRef.current = [...stack, id];
      changed = true;
    } else if (!open && idx !== -1) {
      stackRef.current = stack.filter((item) => item !== id);
      changed = true;
    }

    if (changed) setVersion((v) => v + 1);
  }, []);

  const getLayer = useCallback(
    (id: string): ModalLayerInfo => {
      const stack = stackRef.current;
      const index = stack.indexOf(id);
      if (index === -1) return defaultLayer;
      const overlayZ = MODAL_BASE_Z + index * MODAL_Z_STEP;
      return {
        overlayZ,
        contentZ: overlayZ + 1,
        isTop: index === stack.length - 1,
      };
    },
    [version],
  );

  const value = useMemo(() => ({ register, getLayer }), [register, getLayer]);

  return <ModalLayerContext.Provider value={value}>{children}</ModalLayerContext.Provider>;
}

/** 注册浮层并获取统一 z-index；仅栈顶响应 Escape */
export function useModalLayer(open: boolean): ModalLayerInfo {
  const id = useId();
  const ctx = useContext(ModalLayerContext);
  const register = ctx?.register;
  const getLayer = ctx?.getLayer;

  useLayoutEffect(() => {
    if (!register) return;
    register(id, open);
    return () => register(id, false);
  }, [register, id, open]);

  if (!getLayer) return defaultLayer;
  return getLayer(id);
}
