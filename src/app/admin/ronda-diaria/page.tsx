"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coffee, Eye, EyeOff, Flag, Loader2, MessageCircleQuestion } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type UserLite = { id: string; name: string | null; email: string };

type MirrorRow = {
  id: string;
  question: string;
  hidden: boolean;
  createdAt: string;
  author: UserLite;
  reportCount: number;
};

type ResponseRow = {
  id: string;
  content: string;
  anonymous: boolean;
  hidden: boolean;
  createdAt: string;
  user: UserLite;
  reportCount: number;
  mirrors: MirrorRow[];
};

type RoundRow = {
  id: string;
  date: string;
  prompt: string;
  responses: ResponseRow[];
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminDailyRoundPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(true);
  const [days, setDays] = useState(14);

  const checkAuth = useCallback((res: Response): boolean => {
    if (res.status === 401) {
      router.replace("/admin/login?next=/admin/ronda-diaria");
      return false;
    }
    return true;
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: String(days),
        includeHidden: includeHidden ? "1" : "0",
      });
      const res = await fetch(`/api/admin/daily-round?${params.toString()}`, {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) { toast.error("Error al cargar"); return; }
      const data = (await res.json()) as { rounds: RoundRow[] };
      setRounds(data.rounds ?? []);
    } finally {
      setLoading(false);
    }
  }, [days, includeHidden, checkAuth]);

  useEffect(() => { void load(); }, [load]);

  async function toggleHidden(kind: "response" | "mirror", id: string, hidden: boolean) {
    const res = await fetch("/api/admin/daily-round", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, hidden }),
    });
    if (!checkAuth(res)) return;
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    toast.success(hidden ? "Ocultado" : "Reexpuesto");
    await load();
  }

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Ronda Diaria"
      subtitle="Moderación de respuestas y espejos de La Cafetería"
      onLogout={onLogout}
    >
      <AdminPanel title="Rondas recientes" description="Cada tarjeta roja indica reportes pendientes. Ámbar = ya oculto.">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5">
            <span className="text-xs text-zinc-400">Últimos</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent text-sm text-white focus:outline-none"
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
            </select>
          </div>
          <button
            onClick={() => setIncludeHidden((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              includeHidden
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            {includeHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {includeHidden ? "Mostrando ocultos" : "Solo visibles"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rounds.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-12">No hay rondas en el rango seleccionado.</p>
        ) : (
          <div className="space-y-6">
            {rounds.map((r) => (
              <section key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                      <Coffee className="w-3 h-3" /> {r.date}
                    </p>
                    <p className="text-sm font-semibold text-white leading-snug">{r.prompt}</p>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0">{r.responses.length} respuestas</span>
                </header>

                {r.responses.length === 0 ? (
                  <p className="text-xs text-zinc-600">Nadie respondió este día.</p>
                ) : (
                  <div className="space-y-2">
                    {r.responses.map((resp) => (
                      <div
                        key={resp.id}
                        className={`rounded-lg border p-3 space-y-2 ${
                          resp.hidden
                            ? "border-amber-500/30 bg-amber-500/5"
                            : resp.reportCount > 0
                              ? "border-rose-500/30 bg-rose-500/5"
                              : "border-zinc-800 bg-zinc-950/60"
                        }`}
                      >
                        <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">{resp.content}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                          <span>{resp.anonymous ? "Anónimo · " : ""}{resp.user.name ?? resp.user.email}</span>
                          <span>·</span>
                          <span>{formatDateTime(resp.createdAt)}</span>
                          {resp.reportCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-rose-300">
                              <Flag className="w-3 h-3" /> {resp.reportCount}
                            </span>
                          )}
                          {resp.hidden && (
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-300">Oculto</span>
                          )}
                          <button
                            onClick={() => void toggleHidden("response", resp.id, !resp.hidden)}
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-600 hover:text-white"
                          >
                            {resp.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {resp.hidden ? "Reexponer" : "Ocultar"}
                          </button>
                        </div>

                        {resp.mirrors.length > 0 && (
                          <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                            {resp.mirrors.map((m) => (
                              <div
                                key={m.id}
                                className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
                                  m.hidden
                                    ? "bg-amber-500/5 text-amber-200"
                                    : m.reportCount > 0
                                      ? "bg-rose-500/5 text-rose-200"
                                      : "text-zinc-400"
                                }`}
                              >
                                <MessageCircleQuestion className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
                                <p className="leading-relaxed flex-1">
                                  <span className="text-zinc-100">{m.question}</span>
                                  <span className="text-zinc-500"> · {m.author.name ?? m.author.email} · {formatDateTime(m.createdAt)}</span>
                                  {m.reportCount > 0 && (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] text-rose-300">
                                      <Flag className="w-2.5 h-2.5" /> {m.reportCount}
                                    </span>
                                  )}
                                  {m.hidden && (
                                    <span className="ml-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">Oculto</span>
                                  )}
                                </p>
                                <button
                                  onClick={() => void toggleHidden("mirror", m.id, !m.hidden)}
                                  className="text-[10px] text-zinc-500 hover:text-white shrink-0"
                                >
                                  {m.hidden ? "Reexponer" : "Ocultar"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
