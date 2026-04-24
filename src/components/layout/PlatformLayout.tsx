import type { ReactNode } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";

// hideFooter: en areas internas tipo /app el footer marketing entero (~1300px
// en mobile) hace que la pagina parezca "la web pero comprimida" — feedback
// directo de usuarios. Ocultarlo deja el chat ocupando viewport completo.
export default function PlatformLayout({
  children,
  hideFooter = false,
}: {
  children: ReactNode;
  hideFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <main className="flex-1">{children}</main>
      {hideFooter ? null : <Footer />}
    </div>
  );
}
