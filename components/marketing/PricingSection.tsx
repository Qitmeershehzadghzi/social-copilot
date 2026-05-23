"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    popular: false,
    gradient: "from-gray-600 to-gray-800",
    features: [
      "3 social accounts",
      "10 scheduled posts/month",
      "Basic analytics",
      "Email support",
      "1 team member",
    ],
    cta: "Get Started Free",
    href: "/sign-up",
  },
  {
    name: "Pro",
    description: "For growing businesses",
    price: "$29",
    period: "per month",
    popular: true,
    gradient: "from-purple-600 to-cyan-500",
    features: [
      "10 social accounts",
      "Unlimited scheduled posts",
      "Advanced analytics",
      "Priority support",
      "5 team members",
      "AI auto-replies (100/month)",
      "Media library (5GB)",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
  },
  {
    name: "Agency",
    description: "For agencies & enterprises",
    price: "$99",
    period: "per month",
    popular: false,
    gradient: "from-cyan-600 to-blue-600",
    features: [
      "Unlimited social accounts",
      "Unlimited scheduled posts",
      "Enterprise analytics",
      "24/7 phone support",
      "Unlimited team members",
      "AI auto-replies (unlimited)",
      "Media library (50GB)",
      "Custom branding",
      "White-label dashboard",
      "API access",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
];

const allFeatures = [
  "Social accounts",
  "Scheduled posts",
  "Analytics",
  "Support",
  "Team members",
  "AI auto-replies",
  "Media storage",
  "Custom branding",
  "White-label",
  "API access",
  "Account manager",
];

export default function PricingSection() {
  const { isSignedIn } = useUser();
  const clerk = useClerk() as any;
  const [isVisible, setIsVisible] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("pricing");
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            <span className="block">Simple, Transparent</span>
            <span className="block bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Pricing That Scales
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your needs. All plans include our core features.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-1 mb-12">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isAnnual
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Annual <span className="text-green-400 ml-1">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-sm font-medium rounded-full px-4 py-1">
                    <Star className="w-3 h-3" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Card */}
              <div className={`relative h-full bg-white/5 backdrop-blur-sm border ${
                plan.popular
                  ? "border-purple-500/50"
                  : "border-white/10"
              } rounded-2xl p-8 flex flex-col`}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-5 rounded-2xl`} />

                {/* Plan Header */}
                <div className="relative mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-400">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="relative mb-8">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-white">
                      {isAnnual && plan.name !== "Free" 
                        ? `$${Math.floor(parseInt(plan.price.slice(1)) * 0.8)}`
                        : plan.price
                      }
                    </span>
                    <span className="text-gray-400 ml-2">
                      /{plan.period}
                    </span>
                  </div>
                  {isAnnual && plan.name !== "Free" && (
                    <p className="text-sm text-gray-500 mt-2">
                      Billed annually (${parseInt(plan.price.slice(1)) * 12} total)
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="relative flex-1 mb-8">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="relative">
                  {plan.name === "Free" ? (
                    <Button
                      asChild
                      className={`w-full ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      }`}
                      size="lg"
                    >
                      <Link href={isSignedIn ? "/dashboard" : plan.href}>
                        {isSignedIn ? "Dashboard" : plan.cta}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const planId = plan.name.toLowerCase();
                        if (isSignedIn) {
                          clerk.openCheckout?.({ planId, interval: isAnnual ? 'annual' : 'month' });
                        } else {
                          window.location.href = `/sign-up?plan=${planId}`;
                        }
                      }}
                      className={`w-full ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      }`}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all duration-1000 delay-600 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <div className="p-8">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">
              Compare All Features
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.name} className="text-center py-4 px-6 text-white font-bold">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature) => (
                    <tr key={feature} className="border-b border-white/5 hover:bg-white/2.5">
                      <td className="py-4 px-6 text-gray-300">
                        {feature}
                      </td>
                      {plans.map((plan) => {
                        const hasFeature = plan.features.some(f => 
                          f.toLowerCase().includes(feature.toLowerCase()) ||
                          feature.toLowerCase().includes(f.split(' ')[0].toLowerCase())
                        );
                        return (
                          <td key={`${plan.name}-${feature}`} className="text-center py-4 px-6">
                            {hasFeature ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
