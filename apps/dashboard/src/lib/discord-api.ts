const DISCORD_API_BASE = "https://discord.com/api/v10";
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 2_000;
const DEFAULT_GUILD_CACHE_TTL_MS = 15_000;

interface DiscordFetchOptions {
  cacheGuildResponse?: boolean;
}

interface CachedResponse {
  expiresAt: number;
  response: Response;
}

interface DiscordApiState {
  cache: Map<string, CachedResponse>;
  inFlight: Map<string, Promise<Response>>;
}

const stateKey = "__bloomeraDiscordApiState";
const globalState = globalThis as typeof globalThis & {
  [stateKey]?: DiscordApiState;
};
const state =
  globalState[stateKey] ??
  (globalState[stateKey] = {
    cache: new Map(),
    inFlight: new Map(),
  });

function cacheKey(url: string, init: RequestInit): string {
  const headers = [...new Headers(init.headers).entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return JSON.stringify([url, (init.method ?? "GET").toUpperCase(), headers]);
}

function retryAfterDelay(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return 0;

  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(retryAfter) - Date.now();
  return Math.max(0, Math.min(delay, MAX_RETRY_AFTER_MS));
}

function wait(milliseconds: number): Promise<void> {
  if (milliseconds === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRateLimitRetry(url: string, init: RequestInit): Promise<Response> {
  for (let retry = 0; ; retry++) {
    const response = await fetch(url, init);
    if (response.status !== 429 || retry >= MAX_RATE_LIMIT_RETRIES) return response;

    await wait(retryAfterDelay(response));
  }
}

function isCacheableResponse(response: Response): boolean {
  return response.ok;
}

export async function discordApiFetch(
  pathOrUrl: string,
  init: RequestInit = {},
  options: DiscordFetchOptions = {}
): Promise<Response> {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${DISCORD_API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  const requestInit = { ...init, method: (init.method ?? "GET").toUpperCase() };
  const key = cacheKey(url, requestInit);
  const isGet = requestInit.method === "GET";
  const cacheGuildResponse =
    isGet &&
    options.cacheGuildResponse === true &&
    !/\/users\/@me\/guilds(?:\?|$)/.test(url);
  if (!isGet) return fetchWithRateLimitRetry(url, requestInit);

  const now = Date.now();
  for (const [entryKey, entry] of state.cache) {
    if (entry.expiresAt <= now) state.cache.delete(entryKey);
  }
  const cached = cacheGuildResponse ? state.cache.get(key) : undefined;

  if (cached && cached.expiresAt > now) return cached.response.clone();
  if (cached) state.cache.delete(key);

  let pending: Promise<Response> | undefined = state.inFlight.get(key);
  if (!pending) {
    let trackedRequest: Promise<Response>;
    trackedRequest = fetchWithRateLimitRetry(url, requestInit)
      .then((response) => {
        if (cacheGuildResponse && isCacheableResponse(response)) {
          state.cache.set(key, {
            expiresAt: Date.now() + DEFAULT_GUILD_CACHE_TTL_MS,
            response: response.clone(),
          });
        }
        return response;
      })
      .finally(() => {
        if (state.inFlight.get(key) === trackedRequest) state.inFlight.delete(key);
      });
    pending = trackedRequest;
    state.inFlight.set(key, trackedRequest);
  }

  return (await pending).clone();
}

export function clearDiscordApiCache(): void {
  state.cache.clear();
}
