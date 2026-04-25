"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, RefreshCw, PlayCircle, XCircle } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  state: { dominantPattern: string; primaryEmotion: string; drifted: boolean; updatedAt: string } | null;
};

type Pulse = {
  id: string;
  prompt: string;
  promptSource: string;
  status: string;
  weekStart: string;
  weekEnd: string;
  openedAt: string;
  closedAt: string | null;
  responses: Array<{ id: string; userId: string; content: string; flagged: boolean; submittedAt: string }>;
  reflections: Array<{ id: string; userId: string; content: string; source: string; generatedAt: string; approvedAt: string | null; publishedAt: string | null }>;
};

type CircleDetail = {
  id: string;
  name: string;
  matchPattern: string;
  matchEmotion: string;
  maxMembers: number;
  isActive: boolean;
  startsAt: string;
  cycleEndsAt: string | null;
  members: Member[];
  pulses: Pulse[];
  closingLetters: Array<{ id: string; userId: string; reason: string; generatedAt: string }>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminCircleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CircleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/community/circles/${params.id}`, { credentials: "include" });
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error("load_failed");
      const d = (await res.json()) as { circle: CircleDetail };
      setData(d.circle);
    } catch {
      toast.error("Error al cargar el círculo");
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => { void load(); }, [load]);

  async function action(body: { action: string; reason?: string }) {
    if (!params?.id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/community/circles/${params.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      toast.success("OK");
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title={data?.name ?? "Círculo"}
      subtitle={data ? `${data.matchEmotion} · ${data.matchPattern}` : ""}
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <Link
        href="/admin/community/circles"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Listado
      </Link>

      {loading || !data ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">Cargando...</div>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => void action({ action: "force-pulse" })}
              disabled={busy || !data.isActive}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Forzar pulso semana actual
            </button>
            <button
              onClick={() => {
                if (!confirm("¿Cerrar este círculo? Generará carta de cierre para cada miembro.")) return;
                void action({ action: "close", reason: "removed" });
              }}
              disabled={busy || !data.isActive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> Cerrar círculo
            </button>
            <button
              onClick={() => void load()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refrescar
            </button>
          </div>

          {/* Members */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Miembros ({data.members.filter((m) => !m.leftAt).length}/{data.maxMembers})</h2>
              <p className="text-[11px] text-zinc-500">Ciclo termina: {formatDate(data.cycleEndsAt)}</p>
            </div>
            <div className="space-y-2">
              {data.members.map((m) => (
                <div key={m.id} className={`rounded-lg border p-3 ${m.leftAt ? "border-zinc-800 bg-zinc-950/30 opacity-60" : "border-zinc-800 bg-zinc-950/50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/admin/users/${m.userId}`} className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-violet-300 hover:text-violet-200 truncate">
                        {m.name ?? m.email.split("@")[0]}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{m.email}</p>
                    </Link>
                    {m.leftAt ? (
                      <span className="text-[10px] text-zinc-500">Salió {formatDate(m.leftAt)}</span>
                    ) : m.state?.drifted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                        <AlertTriangle className="h-3 w-3" /> Drift: {m.state.dominantPattern}/{m.state.primaryEmotion}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400">En patrón</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pulses */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Pulsos ({data.pulses.length})</h2>
            {data.pulses.length === 0 ? (
              <p className="text-xs text-zinc-500">Aún no se ha abierto ningún pulso.</p>
            ) : (
              data.pulses.map((p) => (
                <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
                        {p.status} · {p.promptSource}
                      </p>
                      <p className="text-sm text-white mt-1 leading-relaxed">{p.prompt}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {formatDate(p.weekStart)} → {formatDate(p.weekEnd)}
                        {p.closedAt && ` · cerrado ${formatDate(p.closedAt)}`}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 shrink-0">
                      {p.responses.length} respuestas · {p.reflections.length} reflexiones
                    </span>
                  </div>
                  {p.responses.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Respuestas</p>
                      {p.responses.map((r) => (
                        <div key={r.id} className="rounded border border-zinc-800 bg-zinc-950 p-2 text-xs">
                          <p className="text-zinc-200 whitespace-pre-wrap">{r.content}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">user {r.userId.slice(-6)} · {formatDate(r.submittedAt)} {r.flagged && "· FLAGGED"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {p.reflections.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">Reflexiones del mentor</p>
                      {p.reflections.map((r) => (
                        <div key={r.id} className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                          <p className="text-zinc-100 whitespace-pre-wrap">{r.content}</p>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            user {r.userId.slice(-6)} · {r.source}
                            {r.publishedAt ? ` · publicada ${formatDate(r.publishedAt)}` : " · pendiente de aprobación"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          {/* Closing letters */}
          {data.closingLetters.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-white">Cartas de cierre ({data.closingLetters.length})</h2>
              {data.closingLetters.map((l) => (
                <div key={l.id} className="text-xs text-zinc-400">
                  user {l.userId.slice(-6)} · {l.reason} · {formatDate(l.generatedAt)}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </AdminShell>
  );
}
