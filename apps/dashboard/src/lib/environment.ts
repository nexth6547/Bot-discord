type Environment = NodeJS.ProcessEnv;

const isPresent = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPlaceholder = (value: string | undefined) => {
  if (!isPresent(value)) return false;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return (
    normalized.includes("changeme") ||
    normalized.includes("example") ||
    normalized.includes("placeholder") ||
    normalized.startsWith("replace") ||
    /^your[a-z0-9]*(?:here)?$/.test(normalized) ||
    /^votre[a-z0-9]*(?:ici)?$/.test(normalized)
  );
};

const isSnowflake = (value: string | undefined) =>
  typeof value === "string" && /^\d{17,20}$/.test(value.trim());

export function validateDashboardEnvironment(environment: Environment = process.env) {
  const errors: string[] = [];
  const token = environment.DISCORD_TOKEN;
  const clientId = environment.DISCORD_CLIENT_ID;
  const publicClientId = environment.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = environment.DISCORD_CLIENT_SECRET;
  const sessionSecret = environment.NEXTAUTH_SECRET;
  const baseUrl = environment.NEXTAUTH_URL;
  const callbackUrl = environment.DISCORD_REDIRECT_URI;
  const databaseUrl = environment.DATABASE_URL;

  if (!isPresent(token) || isPlaceholder(token)) {
    errors.push("DISCORD_TOKEN est absent, vide ou encore laissé avec une valeur de démonstration.");
  }

  if (!isSnowflake(clientId)) {
    errors.push("DISCORD_CLIENT_ID est absent ou invalide (snowflake requis).");
  }

  if (!isSnowflake(publicClientId)) {
    errors.push("NEXT_PUBLIC_DISCORD_CLIENT_ID est absent ou invalide (snowflake requis).");
  } else if (
    isPresent(clientId) &&
    isPresent(publicClientId) &&
    publicClientId.trim() !== clientId.trim()
  ) {
    errors.push("NEXT_PUBLIC_DISCORD_CLIENT_ID doit correspondre à DISCORD_CLIENT_ID.");
  }

  if (!isPresent(clientSecret) || clientSecret.trim().length < 20 || isPlaceholder(clientSecret)) {
    errors.push("DISCORD_CLIENT_SECRET est absent, trop court ou une valeur de démonstration.");
  }

  if (
    !isPresent(sessionSecret) ||
    sessionSecret.trim().length < 32 ||
    isPlaceholder(sessionSecret)
  ) {
    errors.push("NEXTAUTH_SECRET est absent, trop court (32 caractères minimum) ou une valeur de démonstration.");
  }

  let expectedCallbackUrl: string | undefined;
  if (!isPresent(baseUrl)) {
    errors.push("NEXTAUTH_URL est absent ou vide.");
  } else {
    try {
      const parsedBaseUrl = new URL(baseUrl);
      if (
        !["http:", "https:"].includes(parsedBaseUrl.protocol) ||
        parsedBaseUrl.username ||
        parsedBaseUrl.password ||
        parsedBaseUrl.search ||
        parsedBaseUrl.hash
      ) {
        throw new Error("Invalid dashboard base URL");
      }
      if (environment.NODE_ENV === "production" && parsedBaseUrl.protocol !== "https:") {
        errors.push("NEXTAUTH_URL doit utiliser HTTPS en production.");
      }
      expectedCallbackUrl = new URL("/api/auth/callback/discord", parsedBaseUrl).toString();
    } catch {
      errors.push("NEXTAUTH_URL doit être une URL HTTP(S) absolue valide.");
    }
  }

  if (!isPresent(callbackUrl)) {
    errors.push("DISCORD_REDIRECT_URI est absent ou vide.");
  } else {
    try {
      const parsedCallbackUrl = new URL(callbackUrl);
      if (
        !["http:", "https:"].includes(parsedCallbackUrl.protocol) ||
        parsedCallbackUrl.username ||
        parsedCallbackUrl.password ||
        parsedCallbackUrl.search ||
        parsedCallbackUrl.hash
      ) {
        throw new Error("Invalid OAuth callback URL");
      }
      if (!expectedCallbackUrl || parsedCallbackUrl.toString() !== expectedCallbackUrl) {
        errors.push("DISCORD_REDIRECT_URI doit correspondre à NEXTAUTH_URL/api/auth/callback/discord.");
      }
    } catch {
      errors.push("DISCORD_REDIRECT_URI doit être une URL HTTP(S) absolue valide.");
    }
  }

  if (!isPresent(databaseUrl)) {
    errors.push("DATABASE_URL est absent ou vide.");
  } else if (!/^file:.+/i.test(databaseUrl.trim())) {
    errors.push("DATABASE_URL doit utiliser le provider SQLite (URL commençant par file:).");
  }

  return errors;
}

export function assertDashboardEnvironment(environment: Environment = process.env) {
  const errors = validateDashboardEnvironment(environment);
  if (errors.length > 0) {
    throw new Error(["Configuration du dashboard invalide :", ...errors].join("\n- "));
  }
}
