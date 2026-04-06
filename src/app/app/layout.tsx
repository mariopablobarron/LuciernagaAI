import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";
import FeedbackWidget from "@/components/FeedbackWidget";

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformLayout>
      {children}
      <FeedbackWidget />
    </PlatformLayout>
  );
}
