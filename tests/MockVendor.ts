import { downloadOrigin, uploadOrigin } from "../src/services/renderPolicy";
import type {
  RenderMeta,
  RenderStatus,
  RenderVendor,
} from "../worker/src/vendors/types";

export class MockVendor implements RenderVendor {
  readonly limits = { unitsPerJob: 4 };
  readonly jobs = new Set<string>();
  readonly starts: RenderMeta[] = [];
  readonly deleted: string[] = [];
  fail = false;

  async start(meta: RenderMeta) {
    this.starts.push(meta);
    if (this.fail) throw new Error("private vendor error");
    const jobId = "mock-job-" + this.starts.length;
    this.jobs.add(jobId);
    return {
      jobId,
      uploadUrl: uploadOrigin + "/mock",
      uploadFields: { signature: "signed-upload" },
    };
  }

  async status(id: string): Promise<RenderStatus> {
    return this.jobs.has(id)
      ? { state: "finished", downloadUrl: downloadOrigin + "/preview.pdf" }
      : { state: "failed" };
  }

  async cancel(id: string) {
    this.deleted.push(id);
    this.jobs.delete(id);
  }
}
