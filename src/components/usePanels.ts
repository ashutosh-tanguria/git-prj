import { useEffect, useState } from "react";
import { preference, savePreference } from "../services/preferences";
export function usePanels() {
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(innerWidth),
    [locations, setLocations] = useState(innerWidth >= 900),
    [inspector, setInspector] = useState(innerWidth >= 1200),
    [locationsWidth, setLocationsWidth] = useState(220),
    [inspectorWidth, setInspectorWidth] = useState(320);
  useEffect(() => {
    const resize = () => setWidth(innerWidth);
    window.addEventListener("resize", resize);
    void preference("panes", { locationsWidth: 220, inspectorWidth: 320 }).then(
      (p) => {
        setLocationsWidth(p.locationsWidth);
        setInspectorWidth(p.inspectorWidth);
        setReady(true);
      },
    );
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    setLocations(width >= 900);
    setInspector(width >= 1200);
  }, [width >= 900, width >= 1200]);
  useEffect(() => {
    if (ready) void savePreference("panes", { locationsWidth, inspectorWidth });
  }, [locationsWidth, inspectorWidth, ready]);
  return {
    width,
    locations,
    setLocations,
    inspector,
    setInspector,
    locationsWidth,
    setLocationsWidth,
    inspectorWidth,
    setInspectorWidth,
  };
}
