import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { Header } from "@/components/header";
import { ChatSupport } from "@/components/chat-support";
import { ClientOnlyWrapper } from "@/components/client-only-wrapper";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AuthProvider } from "@/contexts/simple-auth-context";
import { MainContent } from "@/components/main-content";
import { RecaptchaProvider } from "@/components/recaptcha-provider";
import { GenerationLimitsProvider } from "@/contexts/generation-limits-context";

// Modern, clean sans-serif for body text
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-plus-jakarta',
  weight: ['300', '400', '500', '600', '700', '800']
});

// Geometric font for headings
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700']
});

// Clean font for UI elements
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: "Triniva AI - Free AI Image Generation",
  description: "Create stunning images with AI, completely free. Text-to-image, upscaling, style transfer and more.",
  keywords: ["AI image generation", "free AI art", "text to image", "image upscaling", "style transfer"],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: "Triniva AI - Free AI Image Generation",
    description: "Create stunning images with AI, completely free.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${spaceGrotesk.variable} ${dmSans.variable} font-plus-jakarta`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <RecaptchaProvider>
            <AuthProvider>
              <GenerationLimitsProvider>
                <SidebarProvider>
                <div className="min-h-screen overflow-x-hidden">
                  <ClientOnlyWrapper>
                    <Sidebar />
                  </ClientOnlyWrapper>
                  <ClientOnlyWrapper>
                    <MainContent>{children}</MainContent>
                  </ClientOnlyWrapper>
                </div>
                <ClientOnlyWrapper>
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      className: "!bg-card !text-card-foreground !border !border-border pointer-events-none select-none",
                      duration: 4000,
                      style: {
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    }}
                  />
                  <ChatSupport />
                </ClientOnlyWrapper>
                </SidebarProvider>
              </GenerationLimitsProvider>
            </AuthProvider>
          </RecaptchaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}