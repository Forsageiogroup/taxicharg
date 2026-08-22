import "./globals.css";

// NOTE: we deliberately use a system font stack (defined in globals.css)
// instead of next/font/google. next/font/google fetches the font file at
// build time — if that build ever runs somewhere without internet access
// to fonts.googleapis.com, the build fails outright. A system stack has
// zero external dependency, loads instantly, and still looks great.

export const metadata = {
  title: "TaxiCharg | Driver Payment Solution",
  description:
    "TaxiCharg gives NSW taxi drivers fast EFTPOS payments, instant settlement and a driver card built for the road.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-navy-900">
        {children}
      </body>
    </html>
  );
}
