"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  Link as LinkIcon, 
  PenTool, 
  Calendar as CalendarIcon,
  ArrowRight
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: <LinkIcon className="w-8 h-8" />,
    title: "Connect Your Accounts",
    description: "Link all your social media profiles in minutes. We support Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube, and more.",
    color: "from-purple-600 to-pink-600",
  },
  {
    number: "02",
    icon: <PenTool className="w-8 h-8" />,
    title: "Create & Schedule Content",
    description: "Use our AI-powered composer to write engaging posts. Schedule them across all platforms with optimal timing.",
    color: "from-cyan-600 to-blue-600",
  },
  {
    number: "03",
    icon: <CalendarIcon className="w-8 h-8" />,
    title: "Schedule & Automate",
    description: "Set up auto-replies, track performance, and let AI handle engagement while you focus on strategy.",
    color: "from-green-600 to-emerald-600",
  },
];

export default function HowItWorks() {
  const { isSignedIn } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("how-it-works");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="block">How It Works</span>
            <span className="block bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Simple 3-Step Process
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Get started in minutes and transform your social media workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600/50 via-cyan-600/50 to-emerald-600/50 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col items-center text-center transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Step Number */}
                <div className="relative mb-8">
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-full blur-xl opacity-30`} />
                  <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">
                      {step.number}
                    </span>
                  </div>
                  
                  {/* Icon */}
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#0a0a0f] border-4 border-[#0a0a0f] rounded-full flex items-center justify-center">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <div className="text-white">
                        {step.icon}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-400 mb-6">
                  {step.description}
                </p>

                {/* Arrow (Mobile) */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex items-center justify-center my-8">
                    <ArrowRight className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mt-16 transition-all duration-1000 delay-600 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <p className="text-xl text-gray-300 mb-8">
            Ready to streamline your social media workflow?
          </p>
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-medium rounded-full px-8 py-3 transition-all duration-300 hover:scale-105"
          >
            <span>{isSignedIn ? "Open Dashboard" : "Start Your Free Trial"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
