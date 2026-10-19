import { createHash } from "node:crypto";

const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 2_000;
const MAX_CACHE_ENTRIES = 512;
const MAX_CACHE_TTL_MS = 15_000;

interface CachedResponse {
  expiresAt: number;
  response: Response;
}

export interface DiscordRequestOptions {
  cacheTtlMs?: number;
  retryDelay?: (milliseconds: number) => Promise<void>;
}

export class DiscordNetworkError extends Error {
  constructor(cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(message, { cause });
    this.name = "DiscordNetworkError";
  }
}

const responseCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<Response>>();

export function classifyDiscordStatus(status: number): string {
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  if (status === 401) return "unauthorized";
  return "http_error";
}

function retryAfterMilliseconds(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return 0;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

  const date = Date.parse(retryAfter);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}

function requestKey(url: string, init: RequestInit): string {
  const headers = new Headers(init.headers);
  const authorization = headers.get("Authorization") ?? "";
  headers.delete("Authorization");
  const normalizedHeaders = [...headers.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const identity = JSON.stringify({
    method: (init.method ?? "GET").toUpperCase(),
    url,
    authorization,
    headers: normalizedHeaders,
  });
  return createHash("sha256").update(identity).digest("hex");
}

async function fetchWithRateLimitRetry(
  url: string,
  init: RequestInit,
  retryDelay: (milliseconds: number) => Promise<void>
): Promise<Response> {
  for (let retry = 0; ; retry += 1) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new DiscordNetworkError(error);
    }

    if (response.status !== 429 || retry >= MAX_RATE_LIMIT_RETRIES) {
      return response;
    }

    const delay = Math.min(retryAfterMilliseconds(response), MAX_RETRY_DELAY_MS);
    await retryDelay(delay);
  }
}

export async function requestDiscord(
  url: string,
  init: RequestInit = {},
  options: DiscordRequestOptions = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const userGuildList = /\/users\/@me\/guilds(?:\?|$)/.test(url);
  const ttl = Math.min(
    Math.max(0, options.cacheTtlMs ?? 0),
    MAX_CACHE_TTL_MS
  );
  const shouldCache = isGet && ttl > 0 && !userGuildList;
  if (!isGet) {
    return fetchWithRateLimitRetry(
      url,
      init,
      options.retryDelay ?? ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)))
    );
  }

  const key = requestKey(url, init);
  const now = Date.now();
  for (const [cacheKey, cached] of responseCache) {
    if (cached.expiresAt <= now) responseCache.delete(cacheKey);
  }

  if (shouldCache) {
    const cached = responseCache.get(key);
    if (cached) return cached.response.clone();
  }

  let request = inFlightRequests.get(key);
  if (!request) {
    request = fetchWithRateLimitRetry(
      url,
      init,
      options.retryDelay ?? ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)))
    );
    inFlightRequests.set(key, request);
  }

  try {
    const response = await request;
    if (shouldCache && response.ok) {
      while (responseCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey === undefined) break;
        responseCache.delete(oldestKey);
      }
      responseCache.set(key, {
        expiresAt: Date.now() + ttl,
        response: response.clone(),
      });
    }
    return response.clone();
  } finally {
    if (inFlightRequests.get(key) === request) {
      inFlightRequests.delete(key);
    }
  }
}

export function clearDiscordApiCache(): void {
  responseCache.clear();
  inFlightRequests.clear();
}
