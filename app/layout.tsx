import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { themeInitScript } from "@/lib/theme";

const header = Geist({
  variable: "--font-primary",
  subsets: ["latin"],
});

const subheader = Geist_Mono({
  variable: "--font-second",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script sets data-theme before React hydrates.
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${header.variable} ${subheader.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        {/* Sets the theme before the page is shown, so there's no flash of the wrong theme. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
