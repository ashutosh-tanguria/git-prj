import { ProviderError } from "../types";

export interface RefreshCredential {
  token: string;
  until: number;
}

interface Tokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

export interface RefreshStorage {
  read(): Promise<RefreshCredential | undefined>;
  write(value: RefreshCredential): Promise<void>;
  lock<T>(run: () => Promise<T>): Promise<T>;
}

export const workerOrigin = (() => {
  const configured = import.meta.env.VITE_OAUTH_WORKER_URL;
  if (!configured) return "";
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && url.origin === configured
      ? configured
      : "";
  } catch {
    return "";
  }
})();

async function post(worker: string, path: string, body: object) {
  let response: Response;
  try {
    response = await fetch(worker + "/github/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ProviderError("OFFLINE", true);
  }
  if (!response.ok) {
    if (response.status === 401) throw new ProviderError("AUTH_EXPIRED");
    if (response.status === 429) throw new ProviderError("RATE_LIMITED", true);
    throw new ProviderError("PROVIDER_DOWN", true);
  }
  return response;
}

function validSeconds(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value < 32_000_000
  );
}

async function receive(
  worker: string,
  path: string,
  body: object,
): Promise<Tokens> {
  const tokens = (await (await post(worker, path, body)).json()) as Tokens;
  if (
    !tokens?.access_token ||
    typeof tokens.access_token !== "string" ||
    !tokens.refresh_token ||
    typeof tokens.refresh_token !== "string" ||
    !validSeconds(tokens.expires_in) ||
    !validSeconds(tokens.refresh_token_expires_in)
  ) {
    throw new ProviderError("PROVIDER_DOWN", true);
  }
  return tokens;
}

export class GitHubOAuthSession {
  private access = "";
  private expiry = 0;
  private refresh: RefreshCredential | undefined;
  private inFlight: Promise<string> | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private store: RefreshStorage | undefined;
  private release: (() => void) | undefined;
  private closed = false;
  onExpired?: () => void;

  private constructor(
    private readonly worker: string,
    tokens: Tokens,
  ) {
    this.accept(tokens);
  }

  static async exchange(
    worker: string,
    code: string,
    redirectUri: string,
    verifier: string,
  ) {
    return new GitHubOAuthSession(
      worker,
      await receive(worker, "token", {
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    );
  }

  static async unlock(worker: string, store: RefreshStorage) {
    return store.lock(async () => {
      const saved = await store.read();
      if (!saved || saved.until <= Date.now())
        throw new ProviderError("AUTH_EXPIRED");
      const tokens = await receive(worker, "refresh", {
        refresh_token: saved.token,
      });
      const session = new GitHubOAuthSession(worker, tokens);
      try {
        await session.remember(store);
        return session;
      } catch (error) {
        session.close();
        throw error;
      }
    });
  }

  private accept(tokens: Tokens) {
    this.access = tokens.access_token;
    this.expiry = Date.now() + tokens.expires_in * 1000;
    this.refresh = {
      token: tokens.refresh_token,
      until: Date.now() + tokens.refresh_token_expires_in * 1000,
    };
    this.schedule(Math.max(250, (this.expiry - Date.now()) * 0.9));
  }

  private schedule(delay: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        void this.token(this.access).catch((error: Error) => {
          if (!this.closed && error.message !== "AUTH_EXPIRED")
            this.schedule(30000);
        });
      },
      Math.min(delay, 2_000_000_000),
    );
  }

  async remember(store: RefreshStorage) {
    await this.inFlight;
    if (!this.refresh || this.closed) throw new ProviderError("AUTH_EXPIRED");
    this.store = store;
    try {
      await store.write(this.refresh);
    } catch (error) {
      if (this.store === store) this.store = undefined;
      throw error;
    }
  }

  onClose(release: () => void) {
    if (this.closed) release();
    else this.release = release;
  }

  async token(rejected?: string): Promise<string> {
    if (this.closed) throw new ProviderError("AUTH_EXPIRED");
    if (this.inFlight) return this.inFlight;
    if (rejected !== this.access && Date.now() < this.expiry - 30000)
      return this.access;
    const store = this.store;
    const rotate = async () => {
      const saved = store ? await store.read() : this.refresh;
      if (!saved || saved.until <= Date.now() || this.closed)
        throw new ProviderError("AUTH_EXPIRED");
      const tokens = await receive(this.worker, "refresh", {
        refresh_token: saved.token,
      });
      if (this.closed) throw new ProviderError("AUTH_EXPIRED");
      this.accept(tokens);
      if (this.refresh) await store?.write(this.refresh);
      return this.access;
    };
    this.inFlight = (store ? store.lock(rotate) : rotate())
      .catch((error: Error) => {
        if (error.message === "AUTH_EXPIRED" && !this.closed)
          this.onExpired?.();
        throw error;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.access = "";
    this.refresh = undefined;
    this.store = undefined;
    this.release?.();
    this.release = undefined;
  }

  async revoke() {
    try {
      const access = await this.token();
      await post(this.worker, "revoke", { access_token: access });
    } finally {
      this.close();
    }
  }
}
