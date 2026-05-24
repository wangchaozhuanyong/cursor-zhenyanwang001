export function adminTableMobileVisibility(from: "md" | "lg" = "lg") {
  const hideDesktop = from === "md" ? "md:hidden" : "lg:hidden";
  const hideMobile = from === "md" ? "hidden md:block" : "hidden lg:block";
  return { hideDesktop, hideMobile };
}
