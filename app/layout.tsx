import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { PwaRoot } from "@/components/pwa/pwa-root";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://getbruh.app"),
  applicationName: "bruh.",
  title: "bruh. - Get your shit together.",
  description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "bruh.",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "bruh. - Get your shit together.",
    description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
    url: "https://getbruh.app",
    siteName: "bruh.",
    type: "website",
    images: [
      {
        url: "/BruhSS.jpg",
        width: 1200,
        height: 630,
        alt: "bruh. - Get your shit together.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "bruh. - Get your shit together.",
    description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
    images: ["/BruhSS.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6b00",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "bruh.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: "https://getbruh.app",
  description:
    "The AI task manager and focus app for brains that won't cooperate. Brain dump, Pomodoro focus, and calendar sync — no shame, no friction.",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
    { "@type": "Offer", price: "19.99", priceCurrency: "USD", name: "Pro" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" />
          <PwaRoot />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
