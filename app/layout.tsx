import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutlush — paid subscribers",
  description: "Manage paid subscribers and daily deliveries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
