import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSpreadsheet } from "../sandbox/spreadsheet";

describe("spreadsheet worker boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejects inputs above 50 MiB before starting a worker", async () => {
    const worker = vi.fn();
    vi.stubGlobal("Worker", worker);
    await expect(
      parseSpreadsheet(new ArrayBuffer(50 * 1024 * 1024 + 1)),
    ).rejects.toThrow("limit");
    expect(worker).not.toHaveBeenCalled();
  });

  it("terminates a worker that exceeds 20 seconds", async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    vi.stubGlobal(
      "Worker",
      class {
        postMessage() {}
        terminate = terminate;
      },
    );
    const result = parseSpreadsheet(new ArrayBuffer(1));
    const assertion = expect(result).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
    expect(terminate).toHaveBeenCalledOnce();
  });
});
