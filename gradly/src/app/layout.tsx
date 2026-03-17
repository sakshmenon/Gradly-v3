import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const pixelify = Pixelify_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gradly",
  description: "Social academic planning for college students",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pixelify.className} bg-black text-white`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
