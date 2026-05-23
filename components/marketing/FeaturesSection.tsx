"use client";

import { useState, useEffect } from "react";
import { 
  Link, 
  Calendar, 
  MessageSquare, 
  ImageIcon, 
  BarChart3,
  Zap,
  Users
} from "lucide-react";

const features = [
  {
    icon: <Link className="w-6 h-6" />,
    title: "Multi-Platform Connect",
    description: "Connect all your social accounts—Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube, and more—in one unified dashboard.",
    gradient: "from-purple-600 to-pink-600",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Smart Post Composer",
    description: "Write once, publish everywhere. AI-powered suggestions help you craft engaging content that resonates with each platform's audience.",
    gradient: "from-cyan-600 to-blue-600",
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Visual Calendar",
    description: "Drag-and-drop scheduling with a bird's-eye view of your content pipeline. Optimize posting times for maximum engagement.",
    gradient: "from-green-600 to-emerald-600",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "AI Auto-Reply",
    description: "Never miss a comment. AI generates personalized replies that sound human, saving you hours of manual engagement.",
    gradient: "from-orange-600 to-red-600",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Analytics Dashboard",
    description: "Track performance across all platforms. Get actionable insights to improve your strategy and grow your audience.",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Team Collaboration",
    description: "Work seamlessly with your team. Assign roles, manage approvals, and streamline your entire social media workflow.",
    gradient: "from-pink-600 to-rose-600",
  },
];

export default function FeaturesSection() {
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

    const element = document.getElementById("features");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">
              Everything you need
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="block">Powerful Features for</span>
            <span className="block bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Modern Social Teams
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From scheduling to analytics, we&apos;ve built the complete toolkit for social media success.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-500 hover:-translate-y-1 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3 text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>

              {/* Hover Effect Line */}
              <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
