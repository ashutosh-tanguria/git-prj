import { useState } from "react";
import { PrimitiveMatrix } from "./PrimitiveMatrix";
import { DisplayPrimitives } from "./DisplayPrimitives";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { Select } from "../ui/Select";
import { t, setLanguage } from "../i18n";
import styles from "./Styleguide.module.css";
export default function Styleguide() {
  const [theme, setTheme] = useState(
    new URLSearchParams(location.search).get("theme") || "light",
  );
  const [density, setDensity] = useState(
    new URLSearchParams(location.search).get("density") || "default",
  );
  const [language, changeLanguage] = useState("en");
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density;
  return (
    <>
      <a
        className={styles.skip}
        href="#/styleguide#primitives"
        onClick={() => {
          const target = document.getElementById("primitives");
          target?.focus();
          target?.scrollIntoView();
        }}
      >
        {t("skip")}
      </a>
      <header className={styles.header}>
        <strong>Shelf</strong>
        <span>{t("title")}</span>
        <span className={styles.sample}>{t("sample")}</span>
      </header>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={t("title")}>
          {["type", "primitives", "display", "interactive"].map((id) => (
            <a
              key={id}
              href={"#/styleguide#" + id}
              onClick={() => document.getElementById(id)?.scrollIntoView()}
            >
              {t(id === "interactive" ? "demo" : id)}
            </a>
          ))}
        </nav>
        <main className={styles.main}>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
          <div className={styles.controls}>
            <Select
              label={t("theme")}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              options={["light", "dark"].map((value) => ({
                value,
                label: t(value),
              }))}
            />
            <Select
              label={t("density")}
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              options={["compact", "default", "comfortable"].map((value) => ({
                value,
                label: t(value),
              }))}
            />
            <Select
              label={t("language")}
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                changeLanguage(e.target.value);
              }}
              options={[
                { value: "en", label: t("english") },
                { value: "hi", label: t("hindiLanguage") },
              ]}
            />
          </div>
          <p className={styles.meta}>{t("densityNote")}</p>
          <section id="type" className={styles.section}>
            <h2>{t("type")}</h2>
            <p className={styles.specimen}>{t("specimen")}</p>
            <p lang="hi" className={styles.specimen}>
              {t("hindi")}
            </p>
            <code>{t("path")}</code>
            <div className={styles.swatches}>
              {[
                "paper-0",
                "paper-1",
                "paper-2",
                "ink-1",
                "accent",
                "ok",
                "warn",
                "danger",
              ].map((role) => (
                <div key={role}>
                  <span className={styles.swatch} data-swatch={role} />
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </section>
          <section id="primitives" tabIndex={-1} className={styles.section}>
            <h2>{t("primitives")}</h2>
            <PrimitiveMatrix />
          </section>
          <section id="display" className={styles.section}>
            <h2>{t("display")}</h2>
            <DisplayPrimitives />
          </section>
          <section id="interactive" className={styles.section}>
            <h2>{t("demo")}</h2>
            <p>{t("demoHelp")}</p>
            <div className={styles.controls}>
              <Input label={t("input")} defaultValue={t("name")} />
              <Checkbox>{t("checkbox")}</Checkbox>
              <Checkbox isIndeterminate>{t("indeterminate")}</Checkbox>
              <Button isDisabled>{t("action")}</Button>
            </div>
            <div className={styles.controls}>
              <Input label={t("readonly")} readOnly value={t("name")} />
              <Input label={t("password")} type="password" />
              <Select
                label={t("select")}
                options={[{ value: "semester", label: t("longOption") }]}
              />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
