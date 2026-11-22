import { RepositoryFallback } from "./RepositoryFallback";
import { RepositoryAccess } from "./RepositoryAccess";
import "../i18n/m3b";
import { useEffect, useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { Button } from "../ui/Button";
import {
  repositoryOwners,
  repositoryAvailable,
  validRepositoryName,
  createRepository,
} from "../services/repositories";
import type { Repo } from "../services/library";
import { t } from "../i18n";
import styles from "./Library.module.css";
import { githubOAuthSession } from "../providers/github/client";
export function CreateRepository({
  onCreated,
  onClose,
  onRefresh,
  api = { repositoryOwners, repositoryAvailable, createRepository },
}: {
  onCreated: (repo: Repo, branchWarning?: boolean) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  api?: {
    repositoryOwners: typeof repositoryOwners;
    repositoryAvailable: typeof repositoryAvailable;
    createRepository: typeof createRepository;
  };
}) {
  const [owners, setOwners] = useState<string[]>([]),
    [user, setUser] = useState(""),
    [owner, setOwner] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [privateRepo, setPrivate] = useState(true),
    [confirmed, setConfirm] = useState(false),
    [readme, setReadme] = useState(true),
    [available, setAvailable] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const appLogin =
    !!githubOAuthSession() && api.createRepository === createRepository;
  useEffect(() => {
    if (appLogin) return;
    let active = true;
    void api
      .repositoryOwners()
      .then((result) => {
        if (active) {
          setOwners(result.owners);
          setUser(result.user);
          setOwner(result.user);
        }
      })
      .catch(() => setError("repoError"));
    return () => {
      active = false;
    };
  }, [api.repositoryOwners, appLogin]);
  useEffect(() => {
    const abort = new AbortController();
    setAvailable("");
    if (!owner || !validRepositoryName(name)) return;
    const timer = setTimeout(() => {
      void api
        .repositoryAvailable(owner, name, abort.signal)
        .then((free) => {
          if (!abort.signal.aborted)
            setAvailable(free ? owner + "/" + name : "taken");
        })
        .catch(() => {
          if (!abort.signal.aborted) setError("repoError");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [owner, name, api.repositoryAvailable]);
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const repo = await api.createRepository({
        owner,
        user,
        name,
        private: privateRepo,
        publicConfirmed: confirmed,
        description,
        readme,
      });
      onCreated(repo, repo.branchWarning);
      onClose();
    } catch (error) {
      setError(
        ["PERMISSION", "NOT_FOUND"].includes((error as Error).message)
          ? "repoDenied"
          : (error as Error).message === "CONFLICT"
            ? "repoRejected"
            : (error as Error).message === "RATE_LIMITED"
              ? "repoRateLimit"
              : "repoError",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      isOpen
      className={styles.workingPanel + " " + styles.formPanel}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog>
        <Heading slot="title">{t("repoCreate")}</Heading>
        {appLogin ? (
          <RepositoryFallback
            error="githubCreateOnGitHub"
            onRefresh={() =>
              void onRefresh().catch(() => setError("repoError"))
            }
            appLogin
          />
        ) : (
          <>
            <label>
              {t("repoOwner")}
              <select
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  setConfirm(false);
                }}
              >
                {owners.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              {t("repoName")}
              <input
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  setConfirm(false);
                }}
              />
            </label>
            <p role="status">
              {name && !validRepositoryName(name)
                ? t("repoInvalid")
                : available === "taken"
                  ? t("repoTaken")
                  : available === owner + "/" + name
                    ? t("repoAvailable")
                    : name
                      ? t("repoChecking")
                      : ""}
            </p>
            <label>
              {t("repoDescription")}
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <RepositoryAccess
              privateRepo={privateRepo}
              confirmed={confirmed}
              readme={readme}
              onPrivate={setPrivate}
              onConfirm={setConfirm}
              onReadme={setReadme}
            />
            <Button
              variant="primary"
              isDisabled={
                busy ||
                available !== owner + "/" + name ||
                !validRepositoryName(name) ||
                (!privateRepo && !confirmed)
              }
              onPress={() => void create()}
            >
              {t("repoCreate")}
            </Button>
            {error && (
              <RepositoryFallback
                error={error}
                onRefresh={() =>
                  void onRefresh().catch(() => setError("repoError"))
                }
              />
            )}
          </>
        )}
        {appLogin && error && <p role="alert">{t(error)}</p>}
        <Button isDisabled={busy} onPress={onClose}>
          {t("workingCancel")}
        </Button>
      </Dialog>
    </Modal>
  );
}
