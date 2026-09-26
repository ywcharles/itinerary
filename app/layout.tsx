import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const header = Geist({
  variable: "--font-primary",
  subsets: ["latin"],
});

const subheader = Geist_Mono({
  variable: "--font-second",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Itinerary",
  description: "Plan trips together on a shared map and calendar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${header.variable} ${subheader.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
