import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Mezkla – Carta",
  description: "Carta digital de La Mezkla",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-white min-h-screen`}
      >
        {/* HEADER STICKY */}
        <header className="sticky top-0 z-50 bg-neutral-950 border-b border-neutral-800">
          <div className="flex justify-center items-center py-4">
            <img
              src="/logo.png"
              alt="La Mezkla Logo"
              width={400}
              height={400}
              className="h-14 md:h-20 lg:h-24 w-auto"
            />
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="px-4 pb-10">
          {children}
        </main>
      </body>
    </html>
  );
}

