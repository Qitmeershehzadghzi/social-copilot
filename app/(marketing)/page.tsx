import Navbar from "@/components/marketing/Navbar";
import HeroSection from "@/components/marketing/HeroSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import HowItWorks from "@/components/marketing/HowItWorks";
import PricingSection from "@/components/marketing/PricingSection";
import Testimonials from "@/components/marketing/Testimonials";
import Footer from "@/components/marketing/Footer";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <Testimonials />
      <Footer />
    </div>
  );
}