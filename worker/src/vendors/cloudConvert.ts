import {
  downloadOrigin,
  isVendorUrl,
  officeFormats,
  uploadOrigin,
} from "../../../src/services/renderPolicy";
import type { RenderMeta, RenderStatus, RenderVendor } from "./types";

interface Job {
  id: string;
  status: string;
  tasks: {
    name: string;
    result?: {
      form?: { url: string; parameters: Record<string, string | number> };
      files?: { url: string }[];
    };
  }[];
}

export class CloudConvert implements RenderVendor {
  readonly limits = { unitsPerJob: 4 };
  private readonly base: string;

  constructor(
    private readonly key: string,
    mode: "sandbox" | "live",
  ) {
    this.base =
      mode === "sandbox"
        ? "https://sandbox.api.cloudconvert.com/v2"
        : "https://api.cloudconvert.com/v2";
  }

  private async request(path: string, method = "GET", body?: object) {
    const response = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: "Bearer " + this.key,
        Accept: "application/json",
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body && JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok && !(method === "DELETE" && response.status === 404)) {
      throw new Error("CloudConvert request failed");
    }
    return response;
  }

  async start(meta: RenderMeta) {
    const format = Object.entries(officeFormats).find(
      ([, mime]) => mime === meta.mime,
    )?.[0];
    const response = await this.request("/jobs", "POST", {
      tasks: {
        upload: { operation: "import/upload" },
        pdf: {
          operation: "convert",
          input: "upload",
          input_format: format,
          output_format: "pdf",
          filename: "preview.pdf",
          timeout: 60,
        },
        download: { operation: "export/url", input: "pdf" },
      },
    });
    const { data: job } = (await response.json()) as { data: Job };
    try {
      const form = job.tasks.find((task) => task.name === "upload")?.result
        ?.form;
      if (
        !form ||
        !isVendorUrl(form.url, uploadOrigin) ||
        !form.parameters?.signature ||
        Number(form.parameters.max_file_count) !== 1
      )
        throw new Error("Invalid CloudConvert upload form");
      return {
        jobId: job.id,
        uploadUrl: form.url,
        uploadFields: Object.fromEntries(
          Object.entries(form.parameters).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      };
    } catch (error) {
      if (job?.id) await this.cancel(job.id).catch(() => {});
      throw error;
    }
  }

  async status(id: string): Promise<RenderStatus> {
    const response = await this.request("/jobs/" + encodeURIComponent(id));
    const { data: job } = (await response.json()) as { data: Job };
    if (job.status === "waiting" || job.status === "processing")
      return { state: job.status };
    if (job.status !== "finished") return { state: "failed" };
    const downloadUrl = job.tasks.find((task) => task.name === "download")
      ?.result?.files?.[0]?.url;
    if (!downloadUrl || !isVendorUrl(downloadUrl, downloadOrigin))
      throw new Error("Invalid CloudConvert export URL");
    return { state: "finished", downloadUrl };
  }

  async cancel(id: string) {
    await this.request("/jobs/" + encodeURIComponent(id), "DELETE");
  }
}
