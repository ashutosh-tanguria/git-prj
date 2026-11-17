import i18next from "i18next";
import en from "./en/common.json";
import hi from "./hi/common.json";
void i18next.init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en }, hi: { translation: hi } },
  interpolation: { escapeValue: false },
});
export function t(
  key: string,
  options?: { count?: number; size?: string; repo?: string },
): string {
  return i18next.t(key, options ?? {});
}
export function setLanguage(language: string) {
  void i18next.changeLanguage(language);
  document.documentElement.lang = language;
}

