import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const etBook = localFont({
  src: [
    { path: "./fonts/et-book-roman-line-figures.woff", weight: "400", style: "normal" },
    { path: "./fonts/et-book-display-italic-old-style-figures.woff", weight: "400", style: "italic" },
    { path: "./fonts/et-book-bold-line-figures.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-et-book",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acrain",
  description: "A personal forecast of the next decade, and the options I'm keeping open.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${etBook.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
