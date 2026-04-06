import type { ReactNode } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
