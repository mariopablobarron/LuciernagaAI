"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 left-6 z-40 p-3.5 min-h-11 min-w-11 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800 backdrop-blur-sm shadow-lg transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
      aria-label="Volver arriba"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
