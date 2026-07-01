import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Exam Core Admin",
  description: "CMS for managing the Exam Core Database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}>
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Exam Core <span className="text-blue-600">Admin</span>
            </h1>
          </div>
          <nav className="text-sm font-medium text-gray-500 flex gap-4">
            <a href="/" className="hover:text-blue-600 transition-colors">Taxonomy</a>
            <a href="/papers" className="hover:text-blue-600 transition-colors">Papers</a>
            <a href="/ingest" className="hover:text-blue-600 transition-colors">Ingestion Pipeline</a>
          </nav>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
