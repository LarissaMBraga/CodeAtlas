
import "server-only";
import { sign } from "node:crypto";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenPromise: Promise<string> | null = null;

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const encodedPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;

  if (!appId || !encodedPrivateKey) {
    throw new Error("GitHub App credentials are not configured.");
  }

  const privateKey = Buffer.from(
    encodedPrivateKey,
    "base64"
  ).toString("utf8");

  const now = Math.floor(Date.now() / 1000);

  const header = encodeBase64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const payload = encodeBase64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 540,
      iss: appId,
    })
  );

  const unsignedToken = `${header}.${payload}`;

  const signature = sign(
    "RSA-SHA256",
    Buffer.from(unsignedToken),
    privateKey
  ).toString("base64url");

  return `${unsignedToken}.${signature}`;
}

async function createInstallationToken() {
  const installationId = process.env.GITHUB_INSTALLATION_ID;

  if (!installationId) {
    throw new Error("GitHub App installation ID is not configured.");
  }

  const jwt = createAppJwt();

  const response = await fetch(
    `${GITHUB_API_URL}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to generate GitHub installation token: ${response.status}`
    );
  }

  const data: {
    token: string;
    expires_at: string;
  } = await response.json();

  cachedToken = data.token;
  tokenExpiresAt = new Date(data.expires_at).getTime();

  return cachedToken;
}

export async function getGitHubInstallationToken() {
  if (cachedToken && tokenExpiresAt > Date.now() + 60_000) {
    return cachedToken;
  }

  if (!tokenPromise) {
    tokenPromise = createInstallationToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

function createPublicHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
  headers.delete("Authorization");

  return headers;
}

async function canFallbackToPublic(response: Response) {
  if (response.status === 404) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  if (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.headers.has("retry-after")
  ) {
    return false;
  }

  try {
    const data = await response.clone().json();

    return (
      typeof data.message === "string" &&
      data.message.toLowerCase().includes(
        "resource not accessible by integration"
      )
    );
  } catch {
    return false;
  }
}

export async function githubApiFetch(
  endpoint: string,
  init: RequestInit = {}
) {
  const url = `${GITHUB_API_URL}${endpoint}`;

  let token: string;

  try {
    token = await getGitHubInstallationToken();
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "GitHub App credentials are not configured." ||
        error.message === "GitHub App installation ID is not configured."
      )
    ) {
      return fetch(url, {
        ...init,
        headers: createPublicHeaders(init),
        cache: "no-store",
      });
    }

    throw error;
  }

  const headers = new Headers(init.headers);

  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!(await canFallbackToPublic(response))) {
    return response;
  }

  return fetch(url, {
    ...init,
    headers: createPublicHeaders(init),
    cache: "no-store",
  });
}
