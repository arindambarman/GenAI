import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdaptLearn",
  description: "AI-powered adaptive learning platform for banking professionals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
