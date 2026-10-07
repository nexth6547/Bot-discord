import dotenv from "dotenv";
import path from "path";

// Charger les variables depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  defaultPrefix: process.env.DEFAULT_PREFIX || "!",
};

if (!config.token || config.token === "YOUR_BOT_TOKEN_HERE") {
  console.warn("⚠️ Attention : DISCORD_TOKEN n'est pas encore défini dans le fichier .env !");
}
