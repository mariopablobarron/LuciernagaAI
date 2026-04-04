import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PlatformLayout from "@/components/layout/PlatformLayout";
import { getUserAccessState } from "@/services/user";
import { PLANS } from "@/lib/plans";

async function getImpulsoAccess(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("mw_session")?.value;
    if (!session) return PLANS.free.limits.impulsoEnabled;

    // Extract userId from session cookie (format: userId.signature)
    const userId = session.split(".")[0];
    if (!userId) return PLANS.free.limits.impulsoEnabled;

    const access = await getUserAccessState(userId);
    return access.plan === "pro" ? PLANS.pro.limits.impulsoEnabled : PLANS.free.limits.impulsoEnabled;
  } catch {
    return PLANS.free.limits.impulsoEnabled;
  }
}

export default async function ImpulsoLayout({ children }: { children: ReactNode }) {
  const canAccess = await getImpulsoAccess();
  if (!canAccess) {
    redirect("/app?upgrade=impulso");
  }
  return <PlatformLayout>{children}</PlatformLayout>;
}
