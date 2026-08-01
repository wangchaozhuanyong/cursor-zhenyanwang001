const DEFAULT_CATEGORY_HERO = "/assets/fixed-storefront/category-home-hero.webp";

const CATEGORY_HERO_RULES: Array<[RegExp, string]> = [
  [/签证|入境|护照/, "/assets/fixed-storefront/category-visa-hero.webp"],
  [/第二家园|长期居住|居留/, "/assets/fixed-storefront/category-second-home-hero.webp"],
  [/留学|升学|教育/, "/assets/fixed-storefront/category-study-hero.webp"],
  [/装修|家装|施工|商业空间/, "/assets/fixed-storefront/category-renovation-hero.webp"],
  [/酒水|酒类|葡萄酒|烈酒/, "/assets/fixed-storefront/category-wine-hero.webp"],
  [/烟草|香烟|烟品/, "/assets/fixed-storefront/category-tobacco-hero.webp"],
  [/零食|饮料|食品|槟榔/, "/assets/fixed-storefront/category-snacks-drinks-hero.webp"],
];

export function resolveCategoryFallbackHero(name?: string | null): string {
  return resolveCategoryRecommendedHero(name) || DEFAULT_CATEGORY_HERO;
}

export function resolveCategoryRecommendedHero(name?: string | null): string | null {
  const normalizedName = String(name || "").replace(/\s+/g, "");
  return CATEGORY_HERO_RULES.find(([pattern]) => pattern.test(normalizedName))?.[1] || null;
}
