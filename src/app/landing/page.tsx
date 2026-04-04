"use client";

import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingTestimonials />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
