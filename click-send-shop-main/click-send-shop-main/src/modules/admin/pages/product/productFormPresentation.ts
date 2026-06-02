export const ADMIN_PRODUCT_FORM_CONTROL_CLASS =
  "admin-product-form-control w-full rounded-xl border border-[var(--admin-field-border,var(--theme-border))] bg-[var(--admin-field-bg,var(--theme-surface))] px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-[var(--admin-field-focus,var(--theme-primary))] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70";

export const ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS =
  "admin-product-form-control w-full rounded-xl border border-[var(--admin-field-border,var(--theme-border))] bg-[var(--admin-field-bg,var(--theme-surface))] px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-[var(--admin-field-focus,var(--theme-primary))] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70";

export const ADMIN_PRODUCT_FORM_MEDIUM_CONTROL_CLASS =
  "admin-product-form-control w-full rounded-xl border border-[var(--admin-field-border,var(--theme-border))] bg-[var(--admin-field-bg,var(--theme-surface))] px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-[var(--admin-field-focus,var(--theme-primary))] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70";

const imageAltBaseName = (name?: string) => (name || "").trim() || "商品";

export const defaultCoverImageAlt = (name?: string) => `${imageAltBaseName(name)} 封面图`;

export const defaultGalleryImageAlt = (name: string | undefined, index: number) =>
  `${imageAltBaseName(name)} 详情图 ${index + 1}`;
