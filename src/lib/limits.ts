export const MiB = 1024 * 1024;
export const GiB = 1024 * MiB;
export const GITHUB = {
  FILE_INFO_AT: 25 * MiB,
  FILE_WARN_AT: 50 * MiB,
  FILE_BLOCK_AT: 95 * MiB,
  GITHUB_HARD_LIMIT: 100 * MiB,
  BATCH_CAP: 500 * MiB,
  REPO_AMBER_KB: 500 * 1024,
  REPO_RED_KB: 1024 * 1024,
  REPO_BLOCK_KB: 5 * 1024 * 1024,
  LFS_FREE_QUOTA: 10 * GiB,
} as const;
