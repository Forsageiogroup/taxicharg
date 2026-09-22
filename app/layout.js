import "./globals.css";

// The body uses a system font stack (globals.css). The wordmark's face,
// Urbanist, is linked from Google Fonts at run time rather than fetched at
// build time, so a build with no internet still succeeds and the logo
// falls back to a heavy system sans until the font arrives.

export const metadata = {
  title: "TaxiCharg | Driver Payment Solution",
  description:
    "TaxiCharg gives NSW taxi drivers fast EFTPOS payments, instant settlement and a driver card built for the road.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/logo-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-navy-900">
        {children}
      </body>
    </html>
  );
}
