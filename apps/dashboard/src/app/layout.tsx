import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { Bot, Shield, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Bloomera | Dashboard & Gestion de Serveur Discord",
  description: "Interface web de configuration pour Bloomera, le bot Discord chaleureux et complet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-zinc-800">
        <AuthProvider>
          <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-500/60 transition-colors">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-zinc-100 text-lg tracking-tight group-hover:text-amber-400 transition-colors">Bloomera</span>
                  <span className="text-xs px-2 py-0.5 ml-2 rounded-full bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20">
                    Dashboard
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition"
                >
                  Mes Serveurs
                </Link>
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
                >
                  <span>Discord Dev Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col">{children}</main>

          <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
            <p>Bloomera Bot & Dashboard d'administration &bull; Un petit coin de soleil pour votre communauté</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
