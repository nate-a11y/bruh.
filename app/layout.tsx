import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "bruh. - Get your shit together.",
  description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
  manifest: "/manifest.json",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "bruh. - Get your shit together.",
    description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6b00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
