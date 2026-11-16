import * as github from "../providers/github/client";
export { type Entry, type Repo } from "../providers/github/client";
export const library = {
  connect: github.connect,
  disconnect: github.clearToken,
  roots: github.repos,
  list: github.list,
  read: github.read,
};
