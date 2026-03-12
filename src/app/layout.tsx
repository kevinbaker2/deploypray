import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deploy & Pray",
  description: "A survival game for DevOps engineers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
