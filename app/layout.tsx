import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://roshdynamics.anonymous.wtf"),
  title: "5th Gen Warfare Plateform",
  description: "Plateforme de stream en direct. Tech, societe, debats. Rejoins le chat en direct.",
  openGraph: {
    title: "5th Gen Warfare Plateform",
    description: "Plateforme de stream en direct. Tech, societe, debats. Rejoins le chat en direct.",
    url: "https://roshdynamics.anonymous.wtf",
    siteName: "RoshDynamics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "5th Gen Warfare Plateform",
    description: "Plateforme de stream en direct. Tech, societe, debats.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
