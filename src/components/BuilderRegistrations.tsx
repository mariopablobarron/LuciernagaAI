'use client';

import dynamic from 'next/dynamic';

// Pre-loads the Builder.io component bundle client-side across all pages
const BuilderRegistrations = dynamic(
  () => import('@/lib/builderComponents'),
  { ssr: false },
);

export function BuilderRegistrationsWrapper() {
  return <BuilderRegistrations />;
}
