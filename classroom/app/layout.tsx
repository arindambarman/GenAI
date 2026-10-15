import "./globals.css";

export const metadata = { title: "AI Classroom", description: "Learn AI alongside Claude and Gemini" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
