"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function Analytics() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("cookie_consent") : null;
    // Load GA only if user explicitly accepted cookies
    setConsent(stored === "true");
  }, []);

  if (!GA_MEASUREMENT_ID || consent !== true) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
