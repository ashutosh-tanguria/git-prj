import "../i18n/m3b";
import { useState } from "react";
import { t } from "../i18n";
export function TokenPresets() {
  const [create, setCreate] = useState(false);
  return (
    <div>
      <label>
        {t("tokenPreset")}{" "}
        <select
          value={create ? "create" : "read"}
          onChange={(e) => setCreate(e.target.value === "create")}
        >
          <option value="read">{t("tokenReadPush")}</option>
          <option value="create">{t("tokenCreate")}</option>
        </select>
      </label>
      {create && <p>{t("repoGuide")}</p>}
    </div>
  );
}
