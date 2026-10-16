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

export function validateBotEnvironment(environment: Environment = process.env) {
  const errors: string[] = [];
  const token = environment.DISCORD_TOKEN;
  const clientId = environment.DISCORD_CLIENT_ID;
  const databaseUrl = environment.DATABASE_URL;

  if (!isPresent(token) || isPlaceholder(token)) {
    errors.push("DISCORD_TOKEN est absent, vide ou encore laissé avec une valeur de démonstration.");
  }

  if (!isSnowflake(clientId)) {
    errors.push("DISCORD_CLIENT_ID doit être un identifiant Discord valide (snowflake).");
  }

  if (!isPresent(databaseUrl)) {
    errors.push("DATABASE_URL est absent ou vide.");
  } else if (!/^file:.+/i.test(databaseUrl.trim())) {
    errors.push("DATABASE_URL doit utiliser le provider SQLite (URL commençant par file:).");
  }

  return errors;
}

export function assertBotEnvironment(environment: Environment = process.env) {
  const errors = validateBotEnvironment(environment);
  if (errors.length > 0) {
    throw new Error(["Configuration du bot invalide :", ...errors].join("\n- "));
  }
}
