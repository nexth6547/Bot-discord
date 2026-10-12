import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

const isSnowflake = (value: string | undefined) =>
  typeof value === "string" && /^\d{17,20}$/.test(value.trim());

const getDashboardEnvironmentErrors = () => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const publicClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const errors: string[] = [];

  if (!isSnowflake(clientId)) {
    errors.push("DISCORD_CLIENT_ID est absent ou invalide.");
  }

  if (!isSnowflake(publicClientId)) {
    errors.push("NEXT_PUBLIC_DISCORD_CLIENT_ID est absent ou invalide.");
  } else if (clientId && publicClientId && publicClientId.trim() !== clientId.trim()) {
    errors.push("NEXT_PUBLIC_DISCORD_CLIENT_ID doit correspondre à DISCORD_CLIENT_ID.");
  }

  if (!clientSecret || clientSecret.length < 20 || /votre_client_secret|your_client_secret/i.test(clientSecret)) {
    errors.push("DISCORD_CLIENT_SECRET est absent ou trop court.");
  }

  if (
    !nextAuthSecret ||
    nextAuthSecret.length < 32 ||
    /une_cle_secrete|votre_secret|change[-_ ]?me|your[-_ ]?secret/i.test(nextAuthSecret)
  ) {
    errors.push("NEXTAUTH_SECRET est absent ou trop court (32 caractères minimum).");
  }

  let canonicalRedirectUri: string | undefined;
  if (nextAuthUrl) {
    try {
      const parsedUrl = new URL(nextAuthUrl);
      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        parsedUrl.username ||
        parsedUrl.password ||
        parsedUrl.search ||
        parsedUrl.hash
      ) {
        throw new Error("URL invalide");
      }
      if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
        errors.push("NEXTAUTH_URL doit utiliser HTTPS en production.");
      }
      canonicalRedirectUri = new URL("/api/auth/callback/discord", parsedUrl).toString();
    } catch {
      errors.push("NEXTAUTH_URL doit être une URL HTTP(S) absolue valide.");
    }
  } else if (process.env.NODE_ENV === "production") {
    errors.push("NEXTAUTH_URL doit être défini en production.");
  }

  const configuredRedirectUri = process.env.DISCORD_REDIRECT_URI;
  if (configuredRedirectUri) {
    try {
      const redirectUrl = new URL(configuredRedirectUri);
      if (
        !canonicalRedirectUri ||
        redirectUrl.toString() !== canonicalRedirectUri ||
        redirectUrl.username ||
        redirectUrl.password ||
        redirectUrl.search ||
        redirectUrl.hash
      ) {
        errors.push("DISCORD_REDIRECT_URI doit correspondre à NEXTAUTH_URL/api/auth/callback/discord.");
      }
    } catch {
      errors.push("DISCORD_REDIRECT_URI doit être une URL absolue valide.");
    }
  }

  if (process.env.NODE_ENV === "production") {
    if (nextAuthSecret && /une_cle_secrete|votre_secret|change[-_ ]?me|your[-_ ]?secret/i.test(nextAuthSecret)) {
      errors.push("NEXTAUTH_SECRET ne doit pas rester sur une valeur de développement en production.");
    }
  }

  return errors;
};

export function validateDashboardEnvironment() {
  const errors = getDashboardEnvironmentErrors();
  const state = globalThis as typeof globalThis & { __dashboardAuthWarningShown?: boolean };
  if (errors.length > 0 && !state.__dashboardAuthWarningShown) {
    const message = ["⚠️ Configuration OAuth Discord / NextAuth incomplète ou invalide :", ...errors].join("\n- ");
    console.warn(message);
    state.__dashboardAuthWarningShown = true;
  }

  return errors;
}

export function assertDashboardEnvironment() {
  const errors = validateDashboardEnvironment();
  if (process.env.NODE_ENV === "production" && errors.length > 0) {
    throw new Error(`Configuration OAuth Discord / NextAuth invalide :\n- ${errors.join("\n- ")}`);
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
