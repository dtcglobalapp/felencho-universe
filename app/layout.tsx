import type { Metadata } from "next";
import "./globals.css";

import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Felencho Universe",
  description:
    "Interactive global universe of music, podcast, stories and AI experiences by Felencho.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {children}

        <Navbar />
      </body>
    </html>
  );
}