import dotenv from "dotenv";
import path from "path";

// Charger les variables depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const isTruthyPlaceholder = (value: string | undefined, placeholders: string[]) =>
  typeof value === "string" && placeholders.includes(value.trim());

const isSnowflake = (value: string | undefined) =>
  typeof value === "string" && /^\d{17,20}$/.test(value.trim());

export const config = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  defaultPrefix: process.env.DEFAULT_PREFIX || "!",
};

export function validateBotEnvironment() {
  const state = globalThis as typeof globalThis & { __botConfigWarningShown?: boolean };
  if (state.__botConfigWarningShown) {
    return;
  }

  const errors: string[] = [];

  if (!config.token || isTruthyPlaceholder(config.token, ["YOUR_BOT_TOKEN_HERE", "VOTRE_TOKEN_BOT_DISCORD"])) {
    errors.push("DISCORD_TOKEN est absent ou encore laissé avec une valeur de démonstration.");
  }

  if (!isSnowflake(config.clientId)) {
    errors.push("DISCORD_CLIENT_ID doit être un identifiant Discord valide (snowflake). ");
  }

  if (!config.clientSecret || config.clientSecret.length < 20) {
    errors.push("DISCORD_CLIENT_SECRET est absent ou trop court.");
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.includes("une_cle_secrete")) {
      errors.push("NEXTAUTH_SECRET ne doit pas rester sur une valeur de développement en production.");
    }
  }

  if (errors.length > 0) {
    const message = ["⚠️ Configuration Discord incomplète ou invalide :", ...errors].join("\n- ");
    console.warn(message);
    state.__botConfigWarningShown = true;
  }
}

validateBotEnvironment();
