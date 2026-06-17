export const storefrontV2Tokens = {
  page: {
    maxWidth: "max-w-screen-xl",
    mobilePadding: "px-3",
    desktopPadding: "md:px-6 lg:px-8",
    verticalGap: "space-y-5 md:space-y-7",
  },
  radius: {
    card: "rounded-[1rem]",
    image: "rounded-[0.75rem]",
    pill: "rounded-full",
  },
  shadow: {
    card: "shadow-[0_14px_34px_rgba(15,23,42,0.08)]",
    hover: "hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
  },
  border: {
    soft: "border border-[color-mix(in_srgb,var(--theme-border)_82%,transparent)]",
  },
  text: {
    eyebrow: "text-[11px] font-black uppercase tracking-[0.08em] text-[var(--theme-primary)]",
    sectionTitle: "text-lg font-black tracking-normal text-[var(--theme-text)] md:text-xl",
    sectionSubtitle: "mt-1 text-xs leading-5 text-[var(--theme-text-muted)] md:text-sm",
    productTitle: "line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-[var(--theme-text)]",
    price: "text-lg font-black leading-none text-[var(--theme-price)]",
    originalPrice: "text-xs text-[var(--theme-text-muted)] line-through",
  },
  button: {
    primary: "inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow-control)]",
    secondary: "inline-flex items-center justify-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_22%,var(--theme-border))] bg-[var(--theme-surface)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]",
    text: "inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-[var(--theme-primary)]",
  },
} as const;
