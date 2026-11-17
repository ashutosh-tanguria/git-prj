import { t } from "../i18n";
export function RepositoryAccess({
  privateRepo,
  confirmed,
  readme,
  onPrivate,
  onConfirm,
  onReadme,
}: {
  privateRepo: boolean;
  confirmed: boolean;
  readme: boolean;
  onPrivate: (value: boolean) => void;
  onConfirm: (value: boolean) => void;
  onReadme: (value: boolean) => void;
}) {
  return (
    <>
      <label>
        {t("visibility")}{" "}
        <select
          value={privateRepo ? "private" : "public"}
          onChange={(e) => {
            onPrivate(e.target.value === "private");
            onConfirm(false);
          }}
        >
          <option value="private">{t("repoPrivate")}</option>
          <option value="public">{t("repoPublic")}</option>
        </select>
      </label>
      {!privateRepo && (
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => onConfirm(e.target.checked)}
          />
          {t("publicConfirm")}
        </label>
      )}
      <label>
        <input
          type="checkbox"
          checked={readme}
          onChange={(e) => onReadme(e.target.checked)}
        />
        {t("repoReadme")}
      </label>
      <p>{t("branch")}: main</p>
    </>
  );
}
