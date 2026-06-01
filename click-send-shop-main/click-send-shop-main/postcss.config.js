import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

function generatedCssSourcePlugin() {
  return {
    postcssPlugin: "damatong-generated-css-source",
    Once(root) {
      if (!root.source) return;
      root.walk((node) => {
        if (!node.source) {
          node.source = root.source;
        }
      });
    },
  };
}
generatedCssSourcePlugin.postcss = true;

export default {
  plugins: [tailwindcss(), generatedCssSourcePlugin(), autoprefixer()],
};
