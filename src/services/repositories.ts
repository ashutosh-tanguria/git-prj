import { request, type Repo } from "../providers/github/client";
export function validRepositoryName(value: string) {
  return (
    value.length > 0 &&
    value.length <= 100 &&
    /^[a-zA-Z0-9._-]+$/.test(value) &&
    ![".", "..", ".git"].includes(value.toLowerCase())
  );
}
export async function repositoryOwners() {
  const user = (await (await request("/user")).json()) as { login: string };
  let orgs: { organization: { login: string }; role: string }[] = [];
  try {
    orgs = (await (
      await request("/user/memberships/orgs?state=active&per_page=100")
    ).json()) as typeof orgs;
  } catch {
    /* Listing organisations is optional; creation remains server-authorized. */
  }
  return {
    user: user.login,
    owners: [user.login, ...orgs.map((o) => o.organization.login)],
  };
}
export async function repositoryAvailable(
  owner: string,
  name: string,
  signal?: AbortSignal,
) {
  if (!validRepositoryName(name)) return false;
  try {
    await request(
      "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name),
      signal,
    );
    return false;
  } catch (error) {
    if ((error as Error).message === "NOT_FOUND") return true;
    throw error;
  }
}
export async function createRepository(input: {
  owner: string;
  user: string;
  name: string;
  private: boolean;
  publicConfirmed: boolean;
  description: string;
  readme: boolean;
}): Promise<Repo> {
  if (!validRepositoryName(input.name)) throw Error("repositoryNameInvalid");
  if (!input.private && !input.publicConfirmed)
    throw Error("guardVisibilityConfirm");
  const endpoint =
    input.owner === input.user
      ? "/user/repos"
      : "/orgs/" + encodeURIComponent(input.owner) + "/repos";
  const repo = (await (
    await request(endpoint, undefined, false, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        private: input.private,
        description: input.description,
        auto_init: input.readme,
      }),
    })
  ).json()) as Repo;
  // The creation endpoint inherits the owner's branch default. Rename only the newly initialized branch.
  if (input.readme && repo.default_branch !== "main") {
    await request(
      "/repos/" +
        encodeURIComponent(input.owner) +
        "/" +
        encodeURIComponent(input.name) +
        "/branches/" +
        encodeURIComponent(repo.default_branch) +
        "/rename",
      undefined,
      false,
      { method: "POST", body: JSON.stringify({ new_name: "main" }) },
    );
    repo.default_branch = "main";
  }
  return repo;
}
