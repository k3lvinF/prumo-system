import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRUMO SYSTEM | Produção e custos",
  description: "Coleta de produção, rendimento e custos da alimentação transportada.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
