import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";

type StoreScrollChromeState = {
  barsHidden: boolean;
  isAtTop: boolean;
  isScrollingDown: boolean;
  autoHideEnabled: boolean;
};

type StoreScrollChromeActions = {
  setAutoHideEnabled: (enabled: boolean) => void;
};

type StoreScrollChromeStore = {
  getState: () => StoreScrollChromeState;
  subscribe: (listener: () => void) => () => void;
  actions: StoreScrollChromeActions;
  start: () => () => void;
};

type SmartBarsOptions = {
  hideAfter: number;
  showOnUp: number;
  topRevealThreshold: number;
};

function createStoreScrollChromeStore(options: SmartBarsOptions): StoreScrollChromeStore {
  let state: StoreScrollChromeState = {
    barsHidden: false,
    isAtTop: true,
    isScrollingDown: false,
    autoHideEnabled: false,
  };

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  let lastY = 0;
  let downAccumulated = 0;
  let upAccumulated = 0;
  let ticking = false;

  const setState = (partial: Partial<StoreScrollChromeState>) => {
    const next = { ...state, ...partial };
    if (
      next.barsHidden === state.barsHidden &&
      next.isAtTop === state.isAtTop &&
      next.isScrollingDown === state.isScrollingDown &&
      next.autoHideEnabled === state.autoHideEnabled
    ) {
      return;
    }
    state = next;
    emit();
  };

  const actions: StoreScrollChromeActions = {
    setAutoHideEnabled(enabled) {
      setState({ autoHideEnabled: enabled, barsHidden: enabled ? state.barsHidden : false });
      // 切换模式时清空累计，避免“刚开启就立刻隐藏”
      downAccumulated = 0;
      upAccumulated = 0;
      lastY = window.scrollY || 0;
    },
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const currentY = window.scrollY || 0;
      const delta = currentY - lastY;
      const absDelta = Math.abs(delta);

      const isAtTop = currentY <= options.topRevealThreshold;
      const isScrollingDown = delta > 0;

      if (!state.autoHideEnabled) {
        // 仍然更新 isAtTop/isScrollingDown 供订阅方使用，但不做隐藏决策
        setState({ isAtTop, isScrollingDown, barsHidden: false });
        lastY = currentY;
        ticking = false;
        return;
      }

      if (isAtTop) {
        setState({ isAtTop: true, isScrollingDown, barsHidden: false });
        downAccumulated = 0;
        upAccumulated = 0;
        lastY = currentY;
        ticking = false;
        return;
      }

      if (absDelta < 1) {
        setState({ isAtTop: false, isScrollingDown });
        ticking = false;
        return;
      }

      if (delta > 0) {
        downAccumulated += delta;
        upAccumulated = 0;
        const shouldHide = currentY > options.hideAfter && downAccumulated >= options.hideAfter;
        if (shouldHide) {
          setState({ isAtTop: false, isScrollingDown: true, barsHidden: true });
          downAccumulated = 0;
        } else {
          setState({ isAtTop: false, isScrollingDown: true });
        }
      } else {
        upAccumulated += -delta;
        downAccumulated = 0;
        const shouldShow = upAccumulated >= options.showOnUp;
        if (shouldShow) {
          setState({ isAtTop: false, isScrollingDown: false, barsHidden: false });
          upAccumulated = 0;
        } else {
          setState({ isAtTop: false, isScrollingDown: false });
        }
      }

      lastY = currentY;
      ticking = false;
    });
  };

  const start = () => {
    lastY = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
    start,
  };
}

const StoreScrollChromeContext = createContext<StoreScrollChromeStore | null>(null);

export function StoreScrollChromeProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StoreScrollChromeStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStoreScrollChromeStore({ hideAfter: 36, showOnUp: 10, topRevealThreshold: 8 });
  }

  const store = storeRef.current;

  React.useEffect(() => {
    return store.start();
  }, [store]);

  const value = useMemo(() => store, [store]);
  return <StoreScrollChromeContext.Provider value={value}>{children}</StoreScrollChromeContext.Provider>;
}

export function useStoreScrollChromeStore(): StoreScrollChromeStore {
  const store = useContext(StoreScrollChromeContext);
  if (!store) throw new Error("useStoreScrollChromeStore 必须在 StoreScrollChromeProvider 内使用");
  return store;
}

export function useStoreScrollChromeActions(): StoreScrollChromeActions {
  return useStoreScrollChromeStore().actions;
}

export function useStoreScrollChrome<T>(selector: (s: StoreScrollChromeState) => T): T {
  const store = useStoreScrollChromeStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

