import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
