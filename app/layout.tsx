import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rupantar Homes",
  description: "Transforming Spaces Inspiring Lives",
  icons: {
    icon: "/assets/rupantar-favicon.png",
    shortcut: "/assets/rupantar-favicon.png",
    apple: "/assets/rupantar-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Playfair+Display:wght@700&family=Space+Grotesk:wght@600;700&family=Poppins:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
