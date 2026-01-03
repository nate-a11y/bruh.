import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bruh - Get your shit together.",
  description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Bruh - Get your shit together.",
    description: "A task manager that doesn't take itself too seriously. But takes your productivity very seriously.",
    url: "https://getbruh.app",
    siteName: "Bruh",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bruh - Get your shit together.",
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
