"use client";

import { useEffect, useState } from "react";
import { getDailyQuote } from "@/lib/daily-quotes";

export default function DailyQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    // Hydration-safe: getDailyQuote() reads `new Date()` so must run client-side
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuote(getDailyQuote());
  }, []);

  if (!quote) return null;

  return (
    <div className="w-full px-4 py-3 text-center border-b border-zinc-800/50 bg-zinc-900/30">
      <p className="text-sm text-zinc-500 italic leading-relaxed max-w-2xl mx-auto">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
