export function supportsColorMix() {
  return typeof CSS !== "undefined"
    && typeof CSS.supports === "function"
    && CSS.supports("background", "color-mix(in srgb, black, white)");
}
