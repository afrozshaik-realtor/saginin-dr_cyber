import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://app.drcyber.com"),
  title: "Cyber Career Pathway Funnel",
  description: "Discover the cybersecurity pathway that fits your background and career goals."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
