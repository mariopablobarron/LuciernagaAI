import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Empieza gratis tu mentoría con IA. Sin tarjeta, sin compromiso — solo un paso concreto hoy.",
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
