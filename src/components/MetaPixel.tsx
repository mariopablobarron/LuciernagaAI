"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Loads the Meta (Facebook) Pixel script and fires an initial PageView.
 * Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is not set or when the
 * user has not accepted cookies.
 */
export default function MetaPixel() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const general = localStorage.getItem("cookie_consent");
    const meta = localStorage.getItem("meta_consent");
    // Respect specific meta consent if set, otherwise fall back to general consent.
    // Hydration-safe: reading localStorage must happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(meta !== null ? meta === "true" : general === "true");
  }, []);

  if (!PIXEL_ID || consent !== true) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID?.replace(/[^0-9]/g, "")}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
