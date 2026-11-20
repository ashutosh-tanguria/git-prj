import i18next from "i18next";
import "./index";
import en from "./en/office.json";
import hi from "./hi/office.json";
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
