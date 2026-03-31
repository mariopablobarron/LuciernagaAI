"use client";

import Header from "./Header";
import LandingHero from "./LandingHero";
import HowItWorks from "./HowItWorks";
import BenefitsSection from "./BenefitsSection";
import TestimonialsSection from "./TestimonialsSection";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LandingHero />
        <HowItWorks />
        <BenefitsSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
