import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Respondedor — AI Email Manager",
  description: "Backoffice de gestión de emails con respuesta asistida por IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-on-surface antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
