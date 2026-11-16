import i18next from "i18next";
import "./index";
import en from "./en/styleguide.json";
import hi from "./hi/styleguide.json";
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
