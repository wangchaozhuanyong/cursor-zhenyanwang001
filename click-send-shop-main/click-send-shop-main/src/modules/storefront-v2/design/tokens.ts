export const storefrontV2Tokens = {
  page: {
    maxWidth: "max-w-7xl",
    mobilePadding: "px-3",
    desktopPadding: "md:px-6 lg:px-8",
    verticalGap: "space-y-4 md:space-y-6",
  },
  radius: {
    card: "rounded-2xl",
    image: "rounded-xl",
    pill: "rounded-full",
  },
  shadow: {
    card: "shadow-sm",
    hover: "hover:shadow-md",
  },
  border: {
    soft: "border border-[var(--theme-border)]",
  },
  text: {
    sectionTitle: "text-lg font-bold tracking-tight text-[var(--theme-text)] md:text-xl",
    sectionSubtitle: "text-xs text-[var(--theme-text-muted)] md:text-sm",
    productTitle: "line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-[var(--theme-text)]",
    price: "text-lg font-extrabold leading-none text-[var(--theme-price)]",
    originalPrice: "text-xs text-[var(--theme-text-muted)] line-through",
  },
  button: {
    primary: "inline-flex items-center justify-center rounded-full bg-[var(--theme-price)] px-4 py-2 text-sm font-bold text-[var(--theme-price-foreground)]",
    secondary: "inline-flex items-center justify-center rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]",
    text: "inline-flex items-center justify-center rounded-full px-2 py-1 text-sm font-semibold text-[var(--theme-price)]",
  },
} as const;
