import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gradly",
  description: "Social academic planning for college students",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
