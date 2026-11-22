import type { NamedEntry } from "../services/filenameSearch";
import type { TextMatch } from "../services/textSearch";
import type { ReactNode } from "react";
import type { LibraryItem } from "../services/organizer";
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
  content(alternate?: ReactNode): ReactNode;
  explorer?: {
    rows: Entry[];
    endpoint: TransferEndpoint;
    list(ref: string, signal: AbortSignal): Promise<Entry[]>;
    open(item: LibraryItem): void;
    select(items: LibraryItem[]): void;
  };
  status: ReactNode;
  dialogs: ReactNode;
  transferDestination?: TransferEndpoint;
  transferSelection: TransferSource[];
  transferProvider(endpoint: TransferEndpoint): StorageProvider | undefined;
  signOutAll(): Promise<void>;
  openTextResult(item: TextMatch): void;
  openFilenameResult(item: NamedEntry): void;
  filterFolder(query: string): void;
  command(action: string): boolean;
  refresh(): void;
  parent(): void;
}
