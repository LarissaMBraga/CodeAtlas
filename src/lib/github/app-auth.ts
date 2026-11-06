import "server-only";
import { sign } from "node:crypto";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

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

export async function getGitHubInstallationToken() {
  if (cachedToken && tokenExpiresAt > Date.now() + 60_000) {
    return cachedToken;
  }

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

export async function githubApiFetch(
  endpoint: string,
  init: RequestInit = {}
) {
  const token = await getGitHubInstallationToken();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);

  return fetch(`${GITHUB_API_URL}${endpoint}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
