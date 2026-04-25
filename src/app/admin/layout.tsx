import type { ReactNode } from "react";
import PlatformLayout from "@/components/layout/PlatformLayout";
import { NewVersionBanner } from "@/components/NewVersionBanner";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformLayout>
      <NewVersionBanner />
      {children}
    </PlatformLayout>
  );
}
