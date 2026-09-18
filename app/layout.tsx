import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Military Occupation Translator",
  description:
    "Look up the civilian occupations that the U.S. Department of Labor's O*NET crosswalk maps a military occupation code to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
