export type ThemeModeColorConfig = {
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
};

export type ThemeConfig = {
  radius: string;
  fontFamily: string;
  shadowStyle: string;
  imageRatio: string;
  cardStyle: "bordered" | "seamless" | "elevated" | "minimal";
  cardTextAlign: "left" | "center";
  imageFit: "cover" | "contain";
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
  buttonStyle?: "pill" | "rounded" | "square";
  navStyle?: "clean" | "floating" | "glass";
  homeLayout?: "classic" | "magazine" | "deal";
  productCardVariant?: "standard" | "premium" | "compact";
  badgeStyle?: "solid" | "soft" | "outline";
  priceStyle?: "normal" | "bold" | "luxury";
  motionLevel?: "none" | "soft" | "rich";
  density?: "comfortable" | "compact";
  adminThemeMode?: "fixed" | "follow_store";
};
