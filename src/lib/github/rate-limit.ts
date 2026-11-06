export async function isRateLimitResponse(response: Response) {
  if (response.status === 429) {
    return true;
  }

  if (response.status !== 403) {
    return false;
  }

  if (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    response.headers.has("retry-after")
  ) {
    return true;
  }

  try {
    const data = await response.clone().json();

    return (
      typeof data.message === "string" &&
      data.message.toLowerCase().includes("rate limit")
    );
  } catch {
    return false;
  }
}