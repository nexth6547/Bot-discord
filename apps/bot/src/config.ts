import dotenv from "dotenv";
import path from "path";
import { assertBotEnvironment, validateBotEnvironment } from "./environment";

export { assertBotEnvironment, validateBotEnvironment };

// Charger les variables depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  defaultPrefix: process.env.DEFAULT_PREFIX || "!",
};
