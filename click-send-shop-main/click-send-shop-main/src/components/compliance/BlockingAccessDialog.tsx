import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export const BLOCKING_ACCESS_GATE_PRIORITY = {
  language: 100,
  age: 200,
} as const;

type BlockingGateRegistry = Map<string, number>;

type BlockingAccessDialogContextValue = {
  activeGateId: string | null;
  candidateCount: number;
  registerGate: (gateId: string, priority: number) => () => void;
  restoreFocus: () => void;
};

const BlockingAccessDialogContext = createContext<BlockingAccessDialogContextValue | null>(null);

function focusMainContent(): void {
  const main = document.querySelector<HTMLElement>("main, [role='main']");
  if (!main) return;

  const hadTabIndex = main.hasAttribute("tabindex");
  if (!hadTabIndex) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  if (!hadTabIndex) main.removeAttribute("tabindex");
}

export function BlockingAccessDialogProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<BlockingGateRegistry>(() => new Map());
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const stackOpenRef = useRef(false);

  const registerGate = useCallback((gateId: string, priority: number) => {
    setRegistry((current) => {
      if (current.get(gateId) === priority) return current;
      const next = new Map(current);
      next.set(gateId, priority);
      return next;
    });

    return () => {
      setRegistry((current) => {
        if (!current.has(gateId)) return current;
        const next = new Map(current);
        next.delete(gateId);
        return next;
      });
    };
  }, []);

  const activeGateId = useMemo(() => {
    let activeId: string | null = null;
    let activePriority = Number.NEGATIVE_INFINITY;

    registry.forEach((priority, gateId) => {
      if (priority > activePriority || (priority === activePriority && gateId < (activeId ?? gateId))) {
        activeId = gateId;
        activePriority = priority;
      }
    });

    return activeId;
  }, [registry]);

  useLayoutEffect(() => {
    if (activeGateId && !stackOpenRef.current) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      stackOpenRef.current = true;
      return;
    }

    if (!activeGateId) stackOpenRef.current = false;
  }, [activeGateId]);

  const restoreFocus = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;

    if (target && target !== document.body && target.isConnected) {
      target.focus({ preventScroll: true });
      if (document.activeElement === target) return;
    }

    focusMainContent();
  }, []);

  const value = useMemo<BlockingAccessDialogContextValue>(() => ({
    activeGateId,
    candidateCount: registry.size,
    registerGate,
    restoreFocus,
  }), [activeGateId, registerGate, registry.size, restoreFocus]);

  return (
    <BlockingAccessDialogContext.Provider value={value}>
      {children}
    </BlockingAccessDialogContext.Provider>
  );
}

type BlockingAccessDialogProps = {
  gateId: string;
  priority: number;
  children: ReactNode;
  panelClassName?: string;
};

export function BlockingAccessDialog({
  gateId,
  priority,
  children,
  panelClassName,
}: BlockingAccessDialogProps) {
  const context = useContext(BlockingAccessDialogContext);
  const registerGate = context?.registerGate;
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => registerGate?.(gateId, priority), [gateId, priority, registerGate]);

  if (!context) {
    throw new Error("BlockingAccessDialog must be used within BlockingAccessDialogProvider.");
  }

  const active = context.activeGateId === gateId;
  const restoreWhenClosed = context.candidateCount <= 1;

  return (
    <DialogPrimitive.Root open={active} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sf-fixed-access-gate">
          <DialogPrimitive.Content
            ref={contentRef}
            aria-modal="true"
            className={cn("sf-fixed-access-gate__panel", panelClassName)}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              contentRef.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (restoreWhenClosed) context.restoreFocus();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDownOutside={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function BlockingAccessDialogTitle(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <DialogPrimitive.Title asChild>
      <h1 {...props} />
    </DialogPrimitive.Title>
  );
}

export function BlockingAccessDialogDescription(props: ComponentPropsWithoutRef<"p">) {
  return (
    <DialogPrimitive.Description asChild>
      <p {...props} />
    </DialogPrimitive.Description>
  );
}
