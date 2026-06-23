"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type ActiveTracker = {
  provider: "hotjar" | "clarity" | "plausible" | "posthog" | "umami";
  identifier: string;
  apiHost: string | null;
};

/**
 * Loads marketing trackers configured at runtime from the admin panel.
 * Mirrors the consent gating used by Analytics / MetaPixel / Inspectlet:
 * only mounts after the user accepted cookies (general consent or specific
 * `<provider>_consent`).
 *
 * Supported providers: Hotjar, Microsoft Clarity, Plausible, PostHog.
 */
export default function CustomTrackers() {
  const [trackers, setTrackers] = useState<ActiveTracker[]>([]);
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const general = localStorage.getItem("cookie_consent");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(general === "true");
  }, []);

  useEffect(() => {
    if (consent !== true) return;
    let aborted = false;
    fetch("/api/public/trackers/active", { credentials: "omit" })
      .then((r) => r.ok ? r.json() : { trackers: [] })
      .then((d: { trackers: ActiveTracker[] }) => { if (!aborted) setTrackers(d.trackers ?? []); })
      .catch(() => { if (!aborted) setTrackers([]); });
    return () => { aborted = true; };
  }, [consent]);

  if (consent !== true || trackers.length === 0) return null;

  return (
    <>
      {trackers
        // Umami se carga sin consent vía UmamiPublic.tsx (no usa cookies →
        // exento del consent GDPR). Filtramos aquí para evitar doble carga
        // si alguien lo configura desde /admin/marketing → Trackers.
        .filter((t) => t.provider !== "umami")
        .map((t) => {
          const key = `${t.provider}-${t.identifier}`;
          if (t.provider === "hotjar") return <HotjarScript key={key} siteId={t.identifier} />;
          if (t.provider === "clarity") return <ClarityScript key={key} projectId={t.identifier} />;
          if (t.provider === "plausible") return <PlausibleScript key={key} domain={t.identifier} apiHost={t.apiHost} />;
          if (t.provider === "posthog") return <PostHogScript key={key} projectKey={t.identifier} apiHost={t.apiHost} />;
          return null;
        })}
    </>
  );
}

// Provider-specific helpers — kept verbatim from each vendor's docs.

function HotjarScript({ siteId }: { siteId: string }) {
  const id = Number(siteId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return (
    <Script
      id={`hotjar-${siteId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${id},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  );
}

function ClarityScript({ projectId }: { projectId: string }) {
  if (!/^[A-Za-z0-9]+$/.test(projectId)) return null;
  return (
    <Script
      id={`clarity-${projectId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${projectId}");
        `,
      }}
    />
  );
}

function PlausibleScript({ domain, apiHost }: { domain: string; apiHost: string | null }) {
  if (!/^[A-Za-z0-9.\-]+$/.test(domain)) return null;
  const src = apiHost && /^https:\/\/[A-Za-z0-9.\-]+/.test(apiHost)
    ? `${apiHost.replace(/\/+$/, "")}/js/script.js`
    : "https://plausible.io/js/script.js";
  return (
    <Script
      id={`plausible-${domain}`}
      strategy="afterInteractive"
      defer
      data-domain={domain}
      src={src}
    />
  );
}

// Nota: UmamiScript se movió a UmamiPublic.tsx (sin consent, monta global).
// Si en /admin/marketing se configura un Umami custom, se ignora aquí
// (ver filter en el map de arriba).

function PostHogScript({ projectKey, apiHost }: { projectKey: string; apiHost: string | null }) {
  if (!/^[A-Za-z0-9_\-]+$/.test(projectKey)) return null;
  const host = apiHost && /^https:\/\/[A-Za-z0-9.\-]+/.test(apiHost)
    ? apiHost.replace(/\/+$/, "")
    : "https://us.i.posthog.com";
  return (
    <Script
      id={`posthog-${projectKey}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing get_distinct_id get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_session_recording opt_out_session_recording session_recording_started clear_user_properties_for_flags createTestUser".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('${projectKey}', { api_host: '${host}' });
        `,
      }}
    />
  );
}
