export interface RenderMeta {
  size: number;
  mime: string;
  nameHash: string;
}

export interface StartedRender {
  jobId: string;
  uploadUrl: string;
  uploadFields: Record<string, string>;
}

export type RenderStatus =
  | { state: "waiting" | "processing" | "failed" }
  | { state: "finished"; downloadUrl: string };

export interface RenderVendor {
  limits: { unitsPerJob: number };
  start(meta: RenderMeta): Promise<StartedRender>;
  status(id: string): Promise<RenderStatus>;
  cancel(id: string): Promise<void>;
}
