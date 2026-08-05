import "server-only";

import { createSign } from "node:crypto";

const GITHUB_API_VERSION = "2026-03-10";

export type CreatedGitHubIssue = {
  repository: string;
  issueNumber: number;
  issueUrl: string;
  state: string;
};

export function isGitHubFeedbackConfigured() {
  return Boolean(
    process.env.GITHUB_FEEDBACK_REPOSITORY
      && (
        process.env.GITHUB_FEEDBACK_TOKEN
        || (
          process.env.GITHUB_APP_ID
          && process.env.GITHUB_APP_INSTALLATION_ID
          && process.env.GITHUB_APP_PRIVATE_KEY
        )
      ),
  );
}

export async function createGitHubFeedbackIssue({
  title,
  body,
}: {
  title: string;
  body: string;
}): Promise<CreatedGitHubIssue> {
  const repository = parseConfiguredRepository();
  const token = await getGitHubToken(repository);
  const response = await fetch(`https://api.github.com/repos/${repository}/issues`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      title,
      body,
      labels: ["feedback"],
    }),
    cache: "no-store",
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(getGitHubError(payload, "GitHub could not create the issue."));
  }

  const issueNumber = asPositiveInteger(payload.number);
  const issueUrl = asString(payload.html_url);

  if (!issueNumber || !issueUrl) {
    throw new Error("GitHub created the issue but returned an incomplete response.");
  }

  return {
    repository,
    issueNumber,
    issueUrl,
    state: asString(payload.state) || "open",
  };
}

async function getGitHubToken(repository: string) {
  const staticToken = process.env.GITHUB_FEEDBACK_TOKEN?.trim();
  if (staticToken) {
    return staticToken;
  }

  const appId = process.env.GITHUB_APP_ID?.trim();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!appId || !installationId || !privateKey) {
    throw new Error(
      "GitHub promotion is not configured. Add a GitHub App or feedback token to the server environment.",
    );
  }

  const jwt = createGitHubAppJwt(appId, privateKey);
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: "POST",
      headers: githubHeaders(jwt),
      body: JSON.stringify({
        repositories: [repository.split("/")[1]],
        permissions: {
          issues: "write",
        },
      }),
      cache: "no-store",
    },
  );
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(getGitHubError(payload, "GitHub could not authorize the app installation."));
  }

  const token = asString(payload.token);
  if (!token) {
    throw new Error("GitHub returned an empty installation token.");
  }

  return token;
}

function createGitHubAppJwt(appId: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJwtPart({ alg: "RS256", typ: "JWT" });
  const payload = encodeJwtPart({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .end()
    .sign(privateKey, "base64url");

  return `${unsigned}.${signature}`;
}

function encodeJwtPart(value: Record<string, string | number>) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parseConfiguredRepository() {
  const repository = process.env.GITHUB_FEEDBACK_REPOSITORY?.trim() ?? "";

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("GITHUB_FEEDBACK_REPOSITORY must use owner/repo format.");
  }

  return repository;
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "spin-500-feedback",
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getGitHubError(payload: Record<string, unknown>, fallback: string) {
  const message = asString(payload.message);
  return message ? `${fallback} ${message}` : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}
