/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "*.webp" {
  const src: string;
  export default src;
}
