"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

const platforms = [
  { name: "Twitter", color: "bg-[#1DA1F2]" },
  { name: "LinkedIn", color: "bg-[#0077B5]" },
  { name: "Facebook", color: "bg-[#1877F2]" },
  { name: "Instagram", color: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]" },
  { name: "Threads", color: "bg-[#000000]" },
  { name: "TikTok", color: "bg-[#000000]" },
  { name: "YouTube", color: "bg-[#FF0000]" },
  { name: "Pinterest", color: "bg-[#E60023]" },
  { name: "Reddit", color: "bg-[#FF4500]" },
  { name: "Discord", color: "bg-[#5865F2]" },
  { name: "Slack", color: "bg-[#E01E5A]" },
];

export default function HeroSection() {
  const { isSignedIn } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-cyan-900/10" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Animated Badge */}
        <div className={`flex justify-center mb-8 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}>
          <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">
              Trusted by 10,000+ creators & businesses
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div className={`text-center mb-8 transition-all duration-1000 delay-200 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="block">Social Media Management</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            Schedule posts across all platforms, automate replies with AI, and grow your social presence—all from one dashboard.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-1000 delay-400 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white px-8"
          >
            <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
              {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 hover:bg-white/5 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-[#0a0a0f] border border-white/10 p-0">
              <div className="aspect-video w-full bg-black flex items-center justify-center relative rounded-md overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-cyan-900/20" />
                <div className="text-center z-10">
                  <Play className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">Demo Video Placeholder</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Platform Pills */}
        <div className={`transition-all duration-1000 delay-600 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {platforms.map((platform, index) => (
              <div
                key={platform.name}
                className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-2 h-2 rounded-full ${platform.color}`} />
                <span className="text-sm font-medium text-gray-300">
                  {platform.name}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 mt-4 text-sm">
            Connect all your social accounts in one place
          </p>
        </div>

        {/* Animated Scroll Indicator */}
        <div className={`flex justify-center mt-20 transition-all duration-1000 delay-1000 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <div className="animate-bounce p-2 rounded-full bg-white/5 border border-white/10">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>
    </section>
  );
}
