import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import "./styles/tokens.css";
import "./styles/fonts.css";
import "./styles/base.css";
const root = createRoot(document.getElementById("root")!);
if (import.meta.env.DEV || __STYLEGUIDE__) {
  const render = async () => {
    if (location.hash.startsWith("#/styleguide")) {
      const { default: Styleguide } = await import("./screens/Styleguide");
      root.render(
        <StrictMode>
          <Styleguide />
        </StrictMode>,
      );
    } else root.render(null);
  };
  window.addEventListener("hashchange", () => {
    void render();
  });
  void render();
}
