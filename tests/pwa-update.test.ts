import { expect, it, vi } from "vitest";
import { keepAppRunning, whenDeliveryIdle } from "../src/services/updateGate";

it("holds a shared delivery lock and defers an update until the operation settles", async () => {
  const request = vi.fn(
    async (
      name: string,
      options: LockOptions,
      callback: (lock: object) => Promise<unknown>,
    ) => callback({ name, mode: options.mode ?? "exclusive" }),
  );
  vi.stubGlobal("navigator", { locks: { request } });
  let finish!: () => void;
  const delivery = keepAppRunning(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const activate = vi.fn(async () => {});
  try {
    expect(await whenDeliveryIdle(activate)).toBe(false);
    expect(activate).not.toHaveBeenCalled();
    finish();
    await delivery;
    expect(await whenDeliveryIdle(activate)).toBe(true);
    expect(request.mock.calls.map(([, options]) => options)).toEqual([
      { mode: "shared" },
      { ifAvailable: true },
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("defers a reload when another tab holds a delivery lock", async () => {
  vi.stubGlobal("navigator", {
    locks: {
      request: (
        _name: string,
        options: LockOptions,
        callback: (lock: null) => Promise<boolean>,
      ) =>
        options.ifAvailable
          ? callback(null)
          : Promise.reject(Error("expected nonblocking lock")),
    },
  });
  try {
    const activate = vi.fn(async () => {});
    expect(await whenDeliveryIdle(activate)).toBe(false);
    expect(activate).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
