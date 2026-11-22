import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import worker, { RenderQuota } from "../worker";
import { render, type RenderEnv } from "../worker/src/render";
import { CloudConvert } from "../worker/src/vendors/cloudConvert";
import {
  defaultMaxFileBytes,
  officeFormats,
  turnstileOrigin,
} from "../src/services/renderPolicy";
import { MockVendor } from "./MockVendor";

const origin = "https://shelf.example";
const meta = { size: 700, mime: officeFormats.docx, nameHash: "a".repeat(64) };

function setup() {
  const vendor = new MockVendor();
  const db = new DatabaseSync(":memory:");
  let alarm: number | null = null;
  const object = new RenderQuota({
    storage: {
      sql: {
        exec(query, ...bindings) {
          const rows = db.prepare(query).all(...bindings);
          return { toArray: () => rows };
        },
      },
      transactionSync<T>(fn: () => T) {
        db.exec("BEGIN TRANSACTION");
        try {
          const result = fn();
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      getAlarm: async () => alarm,
      setAlarm: async (time) => {
        alarm = time;
      },
    },
  });
  const env: RenderEnv & {
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    OAUTH_LIMIT: { limit(): Promise<{ success: boolean }> };
  } = {
    ALLOWED_ORIGIN: origin,
    GITHUB_CLIENT_ID: "",
    GITHUB_CLIENT_SECRET: "",
    OAUTH_LIMIT: { limit: async () => ({ success: true }) },
    TURNSTILE_SECRET: "turnstile-secret",
    IP_HASH_SALT: "mock-salt",
    KILL_SWITCH: "off",
    DAILY_BUDGET_UNITS: "100",
    PER_IP_DAILY_LIMIT: "2",
    RENDER_QUOTA: { idFromName: (name: string) => name, get: () => object },
  };
  const verify = vi.fn(async (input: string, init: RequestInit) => {
    expect(input).toBe(turnstileOrigin + "/turnstile/v0/siteverify");
    const fields = init.body as URLSearchParams;
    expect(fields.get("secret")).toBe("turnstile-secret");
    return Response.json({
      success: fields.get("response") === "valid",
      hostname: "shelf.example",
      action: "office_render",
    });
  });
  vi.stubGlobal("fetch", verify);
  function request(
    path: string,
    method = "GET",
    ip = "192.0.2.2",
    overrides?: RequestInit,
  ) {
    return new Request("https://worker.example/render/" + path, {
      method,
      headers: {
        Origin: origin,
        "CF-Connecting-IP": ip,
        "Content-Type": "application/json",
        "X-Shelf-Turnstile": "valid",
      },
      body: method === "POST" ? JSON.stringify(meta) : undefined,
      ...overrides,
    });
  }
  const send = (...args: Parameters<typeof request>) =>
    render(request(...args), env, new Headers(), vendor);
  return { send, request, verify, vendor, env, db, object };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("render broker", () => {
  it("returns only coarse capabilities and uses metadata, a signed form, and an opaque job handle", async () => {
    const { send, vendor } = setup();
    expect(await (await send("capabilities")).json()).toEqual({
      tierP: true,
      budgetAvailable: true,
    });
    const response = await send("office/start", "POST");
    expect(response.status).toBe(201);
    const { jobId, uploadFields } = await response.json();
    expect(vendor.starts).toEqual([meta]);
    expect(uploadFields).toEqual({ signature: "signed-upload" });
    expect(jobId).not.toContain("mock-job");
    expect(await (await send("office/status/" + jobId)).json()).toMatchObject({
      state: "finished",
    });
    expect((await send("office/status/" + "a".repeat(92))).status).toBe(404);
  });

  it("denies bad Turnstile, disabled rendering, oversized files and extra body fields before the vendor", async () => {
    const { send, vendor, env, verify } = setup();
    expect(
      (
        await send("office/start", "POST", undefined, {
          body: JSON.stringify({ ...meta, size: defaultMaxFileBytes + 1 }),
        })
      ).status,
    ).toBe(413);
    expect(
      (
        await send("office/start", "POST", undefined, {
          body: JSON.stringify({ ...meta, access_token: "secret" }),
        })
      ).status,
    ).toBe(400);
    expect(verify).not.toHaveBeenCalled();
    vi.mocked(verify).mockResolvedValueOnce(Response.json({ success: false }));
    expect(await (await send("office/start", "POST")).json()).toEqual({
      error: "turnstile",
    });
    delete env.KILL_SWITCH;
    expect(await (await send("capabilities")).json()).toEqual({
      tierP: false,
      budgetAvailable: false,
    });
    expect((await send("office/start", "POST")).status).toBe(503);
    expect(vendor.starts).toHaveLength(0);
  });

  it("atomically hard-stops simultaneous starts from different IPs when the daily budget runs out", async () => {
    const { env, send, vendor } = setup();
    env.DAILY_BUDGET_UNITS = "4";
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        send("office/start", "POST", "192.0.2." + index),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 429)).toHaveLength(9);
    expect(await (await send("capabilities")).json()).toEqual({
      tierP: false,
      budgetAvailable: false,
    });
    expect(vendor.starts).toHaveLength(1);
  });

  it("enforces the salted-IP quota across midnight and expires it after 24 hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T23:30:00Z"));
    const { send, db, vendor, object } = setup();
    expect((await send("office/start", "POST")).status).toBe(201);
    vi.setSystemTime(new Date("2026-11-23T00:30:00Z"));
    expect((await send("office/start", "POST")).status).toBe(201);
    expect(await (await send("office/start", "POST")).json()).toEqual({
      error: "ip_limit",
    });
    const counters = JSON.stringify(db.prepare("SELECT * FROM counters").all());
    expect(counters).not.toMatch(/192\.0\.2\.2|mock-salt|msword|nameHash/);
    vi.setSystemTime(new Date("2026-11-23T23:30:00Z"));
    await object.alarm();
    expect(
      db.prepare("SELECT * FROM counters WHERE key != 'budget'").all(),
    ).toHaveLength(0);
    expect((await send("office/start", "POST")).status).toBe(201);
    expect(vendor.starts).toHaveLength(3);
  });

  it("preserves reservations after vendor failures and allows delete while disabled", async () => {
    const { send, vendor, env } = setup();
    vendor.fail = true;
    expect(await (await send("office/start", "POST")).json()).toEqual({
      error: "vendor",
    });
    vendor.fail = false;
    const { jobId } = await (await send("office/start", "POST")).json();
    expect(await (await send("office/start", "POST")).json()).toEqual({
      error: "ip_limit",
    });
    env.KILL_SWITCH = "on";
    expect((await send("office/" + jobId, "DELETE")).status).toBe(204);
    expect((await send("office/" + jobId, "DELETE")).status).toBe(204);
    expect(vendor.deleted).toEqual(["mock-job-2", "mock-job-2"]);
    expect(vendor.jobs.size).toBe(0);
  });

  it("locks browser preflight and requests to the exact origin and permitted headers", async () => {
    const { request, env } = setup();
    const wrong = await worker.fetch(
      request("capabilities", "GET", undefined, {
        headers: { Origin: origin + ".other" },
      }),
      env,
    );
    expect(wrong.status).toBe(403);
    expect(wrong.headers.has("Access-Control-Allow-Origin")).toBe(false);
    const options = (fields: string) =>
      worker.fetch(
        request("office/start", "OPTIONS", undefined, {
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": fields,
          },
        }),
        env,
      );
    expect((await options("content-type, x-shelf-turnstile")).status).toBe(204);
    expect((await options("authorization")).status).toBe(403);
  });
});

it("uses CloudConvert v2 direct upload, a bounded PDF conversion and URL export in sandbox and live", async () => {
  for (const mode of ["sandbox", "live"] as const) {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    const vendor = new CloudConvert("api-key", mode);
    fetcher.mockResolvedValueOnce(
      Response.json({
        data: {
          id: "vendor-id",
          tasks: [
            {
              name: "upload",
              result: {
                form: {
                  url: "https://upload.cloudconvert.com/import",
                  parameters: { signature: "signed", max_file_count: 1 },
                },
              },
            },
          ],
        },
      }),
    );
    expect(await vendor.start({ ...meta, mime: officeFormats.ppt })).toEqual({
      jobId: "vendor-id",
      uploadUrl: "https://upload.cloudconvert.com/import",
      uploadFields: { signature: "signed", max_file_count: "1" },
    });
    const base =
      "https://" +
      (mode === "sandbox" ? "sandbox." : "") +
      "api.cloudconvert.com/v2/jobs";
    expect(fetcher.mock.calls[0]?.[0]).toBe(base);
    const options = fetcher.mock.calls[0]?.[1];
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer api-key",
    );
    expect(JSON.parse(String(options?.body))).toEqual({
      tasks: {
        upload: { operation: "import/upload" },
        pdf: {
          operation: "convert",
          input: "upload",
          input_format: "ppt",
          output_format: "pdf",
          filename: "preview.pdf",
          timeout: 60,
        },
        download: { operation: "export/url", input: "pdf" },
      },
    });
    fetcher.mockResolvedValueOnce(
      Response.json({
        data: {
          status: "finished",
          tasks: [
            {
              name: "download",
              result: {
                files: [
                  { url: "https://storage.cloudconvert.com/preview.pdf" },
                ],
              },
            },
          ],
        },
      }),
    );
    expect(await vendor.status("vendor-id")).toEqual({
      state: "finished",
      downloadUrl: "https://storage.cloudconvert.com/preview.pdf",
    });
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await vendor.cancel("vendor-id");
    expect(fetcher).toHaveBeenLastCalledWith(
      base + "/vendor-id",
      expect.objectContaining({ method: "DELETE" }),
    );
  }
});
