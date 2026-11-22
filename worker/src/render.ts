import {
  defaultMaxFileBytes,
  officeFormats,
  turnstileOrigin,
} from "../../src/services/renderPolicy";
import { readBody } from "./readBody";
import { CloudConvert } from "./vendors/cloudConvert";
import type { RenderMeta, RenderVendor } from "./vendors/types";

interface QuotaBinding {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

export interface RenderEnv {
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET?: string;
  CLOUDCONVERT_API_KEY?: string;
  CLOUDCONVERT_ENV?: string;
  KILL_SWITCH?: string;
  DAILY_BUDGET_UNITS?: string;
  PER_IP_DAILY_LIMIT?: string;
  MAX_FILE_BYTES?: string;
  IP_HASH_SALT?: string;
  RENDER_QUOTA?: QuotaBinding;
}

const types = new Set<string>(Object.values(officeFormats));
const encoder = new TextEncoder();
const safeInteger = (value: string | undefined, fallback: number) => {
  const number = value === undefined ? fallback : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
};

function metadata(value: unknown): value is RenderMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    Object.keys(data).length === 3 &&
    typeof data.size === "number" &&
    Number.isSafeInteger(data.size) &&
    data.size > 0 &&
    typeof data.mime === "string" &&
    types.has(data.mime) &&
    typeof data.nameHash === "string" &&
    /^[a-f0-9]{64}$/.test(data.nameHash)
  );
}

async function verify(request: Request, env: RenderEnv) {
  const token = request.headers.get("X-Shelf-Turnstile");
  if (!token || token.length > 2048 || !env.TURNSTILE_SECRET) return false;
  try {
    const response = await fetch(turnstileOrigin + "/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result: { success?: boolean; hostname?: string; action?: string } =
      await response.json();
    return (
      result.success === true &&
      result.hostname === new URL(env.ALLOWED_ORIGIN).hostname &&
      result.action === "office_render"
    );
  } catch {
    return false;
  }
}

async function handleKey(env: RenderEnv) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(
      JSON.stringify([
        "render-job",
        env.IP_HASH_SALT,
        env.ALLOWED_ORIGIN,
        env.CLOUDCONVERT_ENV,
      ]),
    ),
  );
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function makeHandle(id: string, env: RenderEnv) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = encoder.encode(
    JSON.stringify({ id, expiry: Date.now() + 86_400_000 }),
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await handleKey(env),
    payload,
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function openHandle(handle: string, env: RenderEnv) {
  try {
    const bytes = Uint8Array.from(
      atob(handle.replace(/-/g, "+").replace(/_/g, "/")),
      (char) => char.charCodeAt(0),
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.subarray(0, 12) },
      await handleKey(env),
      bytes.subarray(12),
    );
    const value: { id: string; expiry: number } = JSON.parse(
      new TextDecoder().decode(decrypted),
    );
    return value.expiry > Date.now() ? value.id : undefined;
  } catch {
    return undefined;
  }
}

function defaultVendor(env: RenderEnv) {
  const mode = env.CLOUDCONVERT_ENV;
  if (env.CLOUDCONVERT_API_KEY && (mode === "sandbox" || mode === "live")) {
    return new CloudConvert(env.CLOUDCONVERT_API_KEY, mode);
  }
}

async function reserve(env: RenderEnv, cost: number, ip?: string) {
  const binding = env.RENDER_QUOTA;
  if (!binding) throw new Error("Missing render quota");
  const budget = safeInteger(env.DAILY_BUDGET_UNITS, 0);
  const ipLimit = safeInteger(env.PER_IP_DAILY_LIMIT, 3);
  let ipHash;
  if (ip) {
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(JSON.stringify(["render-ip", env.IP_HASH_SALT, ip])),
    );
    ipHash = Array.from(new Uint8Array(buffer), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }
  const response = await binding.get(binding.idFromName("office")).fetch(
    new Request("https://quota.internal", {
      method: "POST",
      body: JSON.stringify({ ipHash, cost, budget, ipLimit }),
    }),
  );
  if (!response.ok) throw new Error("Render quota unavailable");
  const result: unknown = await response.json();
  if (result !== "ok" && result !== "budget" && result !== "ip_limit")
    throw new Error("Invalid render quota");
  return result;
}

export async function render(
  request: Request,
  env: RenderEnv,
  headers: Headers,
  vendor = defaultVendor(env) as RenderVendor | undefined,
) {
  const send = (data: object, status = 200) =>
    Response.json(data, { status, headers });
  const fail = (status: number, error: string) => send({ error }, status);
  const url = new URL(request.url);
  const path = url.pathname;
  const start = path === "/render/office/start";
  const capabilities = path === "/render/capabilities";
  const status = /^\/render\/office\/status\/([\w-]{40,256})$/.exec(path);
  const remove = /^\/render\/office\/([\w-]{40,256})$/.exec(path);
  const method = start
    ? "POST"
    : capabilities || status
      ? "GET"
      : remove
        ? "DELETE"
        : undefined;
  if (url.search || !method) return fail(404, "path");
  if (request.method === "OPTIONS") {
    const fields = (request.headers.get("Access-Control-Request-Headers") ?? "")
      .toLowerCase()
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
    if (
      request.headers.get("Access-Control-Request-Method") !== method ||
      fields.some(
        (field) =>
          !start || !["content-type", "x-shelf-turnstile"].includes(field),
      )
    )
      return fail(403, "preflight");
    headers.set("Access-Control-Allow-Methods", method);
    if (start)
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Shelf-Turnstile",
      );
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== method) return fail(405, "method");
  // The shared worker checks Origin first. Render routes never accept credentials.
  if (request.headers.has("Authorization") || request.headers.has("Cookie"))
    return fail(400, "input");
  const enabled =
    env.KILL_SWITCH === "off" &&
    !!env.TURNSTILE_SECRET &&
    !!env.IP_HASH_SALT &&
    !!vendor &&
    !!env.RENDER_QUOTA;
  if (capabilities) {
    if (!enabled || !vendor)
      return send({ tierP: false, budgetAvailable: false });
    try {
      const available =
        (await reserve(env, vendor.limits.unitsPerJob)) === "ok";
      return send({ tierP: available, budgetAvailable: available });
    } catch {
      return send({ tierP: false, budgetAvailable: false });
    }
  }
  if ((!remove && !enabled) || !vendor || !env.IP_HASH_SALT)
    return fail(503, "unavailable");
  if (start) {
    if (
      request.headers
        .get("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      return fail(415, "content_type");
    let meta: RenderMeta;
    try {
      const body = await readBody(request, 512);
      if (body === null) return fail(413, "size");
      const value: unknown = JSON.parse(body);
      if (!metadata(value)) return fail(400, "input");
      meta = value;
    } catch {
      return fail(400, "input");
    }
    if (
      meta.size >
      Math.min(
        defaultMaxFileBytes,
        safeInteger(env.MAX_FILE_BYTES, defaultMaxFileBytes),
      )
    )
      return fail(413, "size");
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) return fail(403, "client");
    if (!(await verify(request, env))) return fail(403, "turnstile");
    try {
      const reservation = await reserve(env, vendor.limits.unitsPerJob, ip);
      if (reservation !== "ok") return fail(429, reservation);
    } catch {
      return fail(503, "unavailable");
    }
    try {
      const job = await vendor.start(meta);
      try {
        return send({ ...job, jobId: await makeHandle(job.jobId, env) }, 201);
      } catch (error) {
        await vendor.cancel(job.jobId).catch(() => {});
        throw error;
      }
    } catch {
      return fail(502, "vendor");
    }
  }
  const handle = (status ?? remove)?.[1];
  const id = handle && (await openHandle(handle, env));
  if (!id) return fail(404, "job");
  try {
    if (remove) {
      await vendor.cancel(id);
      return new Response(null, { status: 204, headers });
    }
    return send(await vendor.status(id));
  } catch {
    return fail(502, "vendor");
  }
}
