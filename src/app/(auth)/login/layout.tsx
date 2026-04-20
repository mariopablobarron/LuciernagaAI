import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu mentoría con IA y continúa donde lo dejaste.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
