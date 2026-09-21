import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NeuronMap — your notes are a universe",
  description:
    "Upload your study notes and NeuronMap charts every concept they contain — stars, planets and moons you can explore and ask questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No `antialiased`: grayscale smoothing thins serif text on Windows —
    // subpixel rendering keeps Garamond crisp.
    <html lang="en" className={`${garamond.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
