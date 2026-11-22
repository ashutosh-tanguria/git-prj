const day = 86_400_000;

interface SqlStorage {
  exec(
    query: string,
    ...bindings: (string | number)[]
  ): {
    toArray(): Record<string, unknown>[];
  };
}

interface Storage {
  sql: SqlStorage;
  transactionSync<T>(callback: () => T): T;
  getAlarm(): Promise<number | null>;
  setAlarm(time: number): Promise<void>;
}

export class RenderQuota {
  private readonly sql: SqlStorage;

  constructor(private readonly state: { storage: Storage }) {
    this.sql = state.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, units INTEGER NOT NULL, expires INTEGER NOT NULL)",
    );
  }

  private clean(now: number) {
    this.sql.exec("DELETE FROM counters WHERE expires <= ?", now);
  }

  async alarm() {
    this.clean(Date.now());
    const next = this.sql
      .exec("SELECT MIN(expires) AS expires FROM counters")
      .toArray()[0]?.expires;
    if (typeof next === "number") await this.state.storage.setAlarm(next);
  }

  private count(key: string) {
    return Number(
      this.sql
        .exec("SELECT units FROM counters WHERE key = ?", key)
        .toArray()[0]?.units ?? 0,
    );
  }

  private add(key: string, units: number, expires: number) {
    this.sql.exec(
      "INSERT INTO counters VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET units = units + excluded.units",
      key,
      units,
      expires,
    );
  }

  async fetch(request: Request) {
    const { ipHash, cost, budget, ipLimit } = (await request.json()) as {
      ipHash?: string;
      cost: number;
      budget: number;
      ipLimit: number;
    };
    const now = Date.now();
    const reset = (Math.floor(now / day) + 1) * day;
    const result = this.state.storage.transactionSync(() => {
      this.clean(now);
      if (this.count("budget") + cost > budget) return "budget";
      if (!ipHash) return "ok";
      if (this.count(ipHash) >= ipLimit) return "ip_limit";
      this.add("budget", cost, reset);
      this.add(ipHash, 1, now + day);
      return "ok";
    });
    if (
      ipHash &&
      result === "ok" &&
      (await this.state.storage.getAlarm()) === null
    ) {
      await this.state.storage.setAlarm(reset);
    }
    return Response.json(result);
  }
}
