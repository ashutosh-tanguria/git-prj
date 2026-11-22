import type { ReactNode } from "react";
import type { Entry, Location } from "../providers/types";

export interface CloudLocations {
  roots: Location[];
  active?: string;
  list(ref: string): Promise<Entry[]>;
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
  command(action: string): boolean;
  refresh(): void;
  parent(): void;
}
