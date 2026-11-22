import type { TextMatch } from "../services/textSearch";
import type { ReactNode } from "react";
import type { Entry, Location, StorageProvider } from "../providers/types";
import type {
  TransferEndpoint,
  TransferSource,
} from "../services/transferTypes";

export interface CloudLocations {
  roots: Location[];
  active?: string;
  list(ref: string): Promise<Entry[]>;
  path?(ref: string): string | undefined;
  open(ref: string): void;
  refresh: number;
}

export interface CloudLibrary {
  locations: CloudLocations;
  active: boolean;
  connectRows: ReactNode;
  settings: ReactNode;
  content: ReactNode;
  status: ReactNode;
  dialogs: ReactNode;
  transferDestination?: TransferEndpoint;
  transferSelection: TransferSource[];
  transferProvider(endpoint: TransferEndpoint): StorageProvider | undefined;
  openTextResult(item: TextMatch): void;
  command(action: string): boolean;
  refresh(): void;
  parent(): void;
}
