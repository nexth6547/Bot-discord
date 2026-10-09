import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const isSnowflake = (value: string | undefined) =>
  typeof value === "string" && /^\d{17,20}$/.test(value.trim());

export function validateDashboardEnvironment() {
  const state = globalThis as typeof globalThis & { __dashboardAuthWarningShown?: boolean };
  if (state.__dashboardAuthWarningShown) {
    return;
  }

  const errors: string[] = [];

  if (!process.env.DISCORD_CLIENT_ID || !isSnowflake(process.env.DISCORD_CLIENT_ID)) {
    errors.push("DISCORD_CLIENT_ID est absent ou invalide.");
  }

  if (!process.env.DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET.length < 20) {
    errors.push("DISCORD_CLIENT_SECRET est absent ou trop court.");
  }

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push("NEXTAUTH_SECRET est absent ou trop court (32 caractères minimum).");
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXTAUTH_URL) {
      errors.push("NEXTAUTH_URL doit être défini en production.");
    }
    if (process.env.NEXTAUTH_SECRET && /une_cle_secrete|votre_secret/i.test(process.env.NEXTAUTH_SECRET)) {
      errors.push("NEXTAUTH_SECRET ne doit pas rester sur une valeur de développement en production.");
    }
  }

  if (errors.length > 0) {
    const message = ["⚠️ Configuration OAuth Discord / NextAuth incomplète ou invalide :", ...errors].join("\n- ");
    console.warn(message);
    state.__dashboardAuthWarningShown = true;
  }
}

validateDashboardEnvironment();

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60 * 60 * 1000;
        delete token.accessTokenError;
      }

      if (
        token.accessToken &&
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 60_000
      ) {
        return token;
      }

      if (!token.refreshToken) {
        token.accessTokenError = "RefreshAccessTokenError";
        return token;
      }

      try {
        const response = await fetch("https://discord.com/api/v10/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID ?? "",
            client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });

        if (!response.ok) {
          console.error("Discord OAuth token refresh failed:", response.status);
          token.accessTokenError = "RefreshAccessTokenError";
          return token;
        }

        const refreshed = (await response.json()) as {
          access_token: string;
          expires_in: number;
          refresh_token?: string;
        };

        token.accessToken = refreshed.access_token;
        token.accessTokenExpires = Date.now() + refreshed.expires_in * 1000;
        token.refreshToken = refreshed.refresh_token ?? token.refreshToken;
        delete token.accessTokenError;
      } catch (error) {
        console.error("Discord OAuth token refresh failed:", error);
        token.accessTokenError = "RefreshAccessTokenError";
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.accessTokenError = token.accessTokenError;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
