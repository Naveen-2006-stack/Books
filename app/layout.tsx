import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BooksFlow - Accounting and Bookkeeping",
  description: "Double-entry accounting dashboard for small businesses and freelancers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(180,83,9,0.14),_transparent_24%),linear-gradient(180deg,_#fbfdff_0%,_#f4f7fb_38%,_#ecf2f8_100%)] text-slate-900">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-teal-400/20 blur-3xl animate-[float-slow_12s_ease-in-out_infinite]" />
          <div className="absolute right-[-7rem] top-[10rem] h-80 w-80 rounded-full bg-amber-400/20 blur-3xl animate-[float-slow_14s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-slate-400/10 blur-3xl animate-[float-slow_16s_ease-in-out_infinite]" />
        </div>
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        {children}
      </body>
    </html>
  );
}
