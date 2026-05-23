import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Copilot — AI-Powered Social Media Management",
  description: "Schedule posts across all platforms, automate replies with AI, and grow your social presence—all from one dashboard.",
  openGraph: {
    title: "Social Copilot — AI-Powered Social Media Management",
    description: "Schedule posts across all platforms, automate replies with AI, and grow your social presence—all from one dashboard.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Copilot — AI-Powered Social Media Management",
    description: "Schedule posts across all platforms, automate replies with AI, and grow your social presence—all from one dashboard.",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}