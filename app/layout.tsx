import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Wars",
  description:
    "Who's buying tomorrow's memory before it's made... Who decides what you'll run and remember tomorrow?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
