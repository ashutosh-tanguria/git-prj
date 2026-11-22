import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import "./styles/tokens.css";
import "./styles/fonts.css";
import "./styles/base.css";
const root = createRoot(document.getElementById("root")!);
async function render() {
  if (
    (import.meta.env.DEV || __STYLEGUIDE__) &&
    location.hash.startsWith("#/styleguide")
  ) {
    const { default: Styleguide } = await import("./screens/Styleguide");
    root.render(
      <StrictMode>
        <Styleguide />
      </StrictMode>,
    );
  } else {
    const { default: Library } = await import("./screens/Library");
    root.render(
      <StrictMode>
        <Library />
      </StrictMode>,
    );
  }
}
window.addEventListener("hashchange", () => {
  void render();
});
void render();

if (typeof BroadcastChannel !== "undefined") {
  const resets = new BroadcastChannel("shelf-reset");
  resets.onmessage = ({ data }) => {
    if (data === "start") root.unmount();
    if (data === "finish") {
      history.replaceState(null, "", location.pathname + location.search);
      location.reload();
    }
  };
}
