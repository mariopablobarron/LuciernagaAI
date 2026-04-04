import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>;
}
