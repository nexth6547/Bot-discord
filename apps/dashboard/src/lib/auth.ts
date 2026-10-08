import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

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
