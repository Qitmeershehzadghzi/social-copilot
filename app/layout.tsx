import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Copilot - Multi-Platform Social Media Scheduler & AI Assistant",
  description: "Schedule posts across all platforms, automate replies with AI, and grow your social presence—all from one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "blockButton",
          logoPlacement: "inside",
        },
        variables: {
          colorPrimary: "#8b5cf6",
          colorText: "#ffffff",
          colorTextSecondary: "#9ca3af",
          colorBackground: "#0a0a0f",
          colorInputBackground: "rgba(255, 255, 255, 0.05)",
          colorInputText: "#ffffff",
          colorNeutral: "#374151",
        },
        elements: {
          formButtonPrimary: "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white",
          socialButtonsBlockButton: "bg-white/10 border-white/20 text-white hover:bg-white/20",
          formFieldInput: "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500",
          footerActionLink: "text-cyan-400 hover:text-cyan-300",
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
