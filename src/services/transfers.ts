import { transferStorage } from "./workingStorage";
import { createTransferJournal } from "./transferJournal";
import { transferHash } from "./transferHashClient";
import type { Transfer } from "./transferTypes";

export const transfers = createTransferJournal(
  { ...transferStorage, load: () => transferStorage.load<Transfer[]>() },
  (action) => navigator.locks.request("shelf-transfers", action),
  transferHash,
);
