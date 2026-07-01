/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ closeButton, toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isStoreScope =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-app-scope") === "store";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={closeButton ?? isStoreScope}
      /* 顶栏展示，避免与前台/后台底栏 Tab 抢触控区域；顶距尊重刘海安全区 */
      position="top-center"
      offset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast:
            "group toast group-[.toaster]:pointer-events-auto group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-[var(--theme-primary)] group-[.toast]:text-[var(--theme-primary-foreground)]",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
