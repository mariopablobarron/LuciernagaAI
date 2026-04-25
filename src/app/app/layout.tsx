import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";
import FeedbackWidget from "@/components/FeedbackWidget";
import EmotionalAccentProvider from "@/components/EmotionalAccentProvider";
import { NewVersionBanner } from "@/components/NewVersionBanner";

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformLayout hideFooter>
      <EmotionalAccentProvider />
      <NewVersionBanner />
      {children}
      <FeedbackWidget />
    </PlatformLayout>
  );
}
