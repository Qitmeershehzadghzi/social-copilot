"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageSquare } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  const scrollToSection = (targetId: string) => {
    const elem = document.getElementById(targetId);
    elem?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    const href = e.currentTarget.href;
    const targetId = href.replace(/.*\#/, "");
    scrollToSection(targetId);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Social Copilot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={handleScroll}
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isSignedIn ? (
              <>
                <Button asChild size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white">
                  <Link href="/dashboard">
                    Dashboard
                  </Link>
                </Button>
                <UserButton />
              </>
            ) : (
              <>
              <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Link href="/sign-in">
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white">
                <Link href="/sign-up">
                  Get Started Free
                </Link>
              </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0a0a0f] border-l border-white/10">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      Social Copilot
                    </span>
                  </div>
                  <SheetClose render={<Button variant="ghost" size="icon" />}>
                    <X className="w-5 h-5" />
                  </SheetClose>
                </div>
                <nav className="flex-1 space-y-6">
                  {navLinks.map((link) => (
                    <SheetClose
                      key={link.label}
                      render={
                        <button
                          type="button"
                          onClick={() => scrollToSection(link.href.replace("#", ""))}
                          className="block w-full text-left text-gray-300 hover:text-white transition-colors text-lg font-medium"
                        />
                      }
                    >
                      {link.label}
                    </SheetClose>
                  ))}
                </nav>
                <div className="space-y-4 pt-8 border-t border-white/10">
                  {isSignedIn ? (
                    <>
                      <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white">
                        <Link href="/dashboard" className="block">
                          Dashboard
                        </Link>
                      </Button>
                      <div className="flex items-center justify-center pt-2">
                        <UserButton />
                      </div>
                    </>
                  ) : (
                    <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/sign-in" className="block">
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white">
                      <Link href="/sign-up" className="block">
                        Get Started Free
                      </Link>
                    </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
