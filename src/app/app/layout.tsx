import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";

export default function AppRootLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
