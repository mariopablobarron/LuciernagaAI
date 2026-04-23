import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";
import FeedbackWidget from "@/components/FeedbackWidget";
import EmotionalAccentProvider from "@/components/EmotionalAccentProvider";

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformLayout>
      <EmotionalAccentProvider />
      {children}
      <FeedbackWidget />
    </PlatformLayout>
  );
}
