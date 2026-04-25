"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const INSPECTLET_WID = process.env.NEXT_PUBLIC_INSPECTLET_WID ?? "1417203707";

/**
 * Inspectlet — session replay & heatmaps.
 * Solo se monta si el usuario aceptó cookies (general o `inspectlet_consent`).
 * Para desactivar globalmente: borrar NEXT_PUBLIC_INSPECTLET_WID en env.
 */
export default function Inspectlet() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const general = localStorage.getItem("cookie_consent");
    const specific = localStorage.getItem("inspectlet_consent");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(specific !== null ? specific === "true" : general === "true");
  }, []);

  if (!INSPECTLET_WID || consent !== true) return null;

  return (
    <Script
      id="inspectlet"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            window.__insp = window.__insp || [];
            __insp.push(['wid', ${INSPECTLET_WID}]);
            var ldinsp = function(){
              if(typeof window.__inspld != "undefined") return;
              window.__inspld = 1;
              var insp = document.createElement('script');
              insp.type = 'text/javascript';
              insp.async = true;
              insp.id = "inspsync";
              insp.src = ('https:' == document.location.protocol ? 'https' : 'http') + '://cdn.inspectlet.com/inspectlet.js?wid=${INSPECTLET_WID}&r=' + Math.floor(new Date().getTime()/3600000);
              var x = document.getElementsByTagName('script')[0];
              x.parentNode.insertBefore(insp, x);
            };
            setTimeout(ldinsp, 0);
          })();
        `,
      }}
    />
  );
}
