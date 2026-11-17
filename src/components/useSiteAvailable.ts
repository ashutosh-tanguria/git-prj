import { useEffect, useState } from "react";
export function useSiteAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const status = (event: Event) =>
      setAvailable(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("shelf-site-available", status);
    window.dispatchEvent(new Event("shelf-site-status"));
    return () => window.removeEventListener("shelf-site-available", status);
  }, []);
  return available;
}
export const openSitePreview = () =>
  window.dispatchEvent(new Event("shelf-preview-site"));
