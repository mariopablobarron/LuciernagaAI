"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AdminShell } from "@/features/admin/components/AdminShell";
import type {
  ClinicalUserDetail,
  InterventionType,
} from "@/features/admin-clinical/types";

const INTERVENTION_TYPES: Array<{ value: InterventionType; label: string }> = [
  { value: "message", label: "Mensaje" },
  { value: "recommendation", label: "Recomendación" },
  { value: "resource", label: "Recurso" },
  { value: "assessment", label: "Evaluación" },
];

const RISK_VARIANT: Record<string, "secondary" | "warning" | "danger"> = {
  low: "secondary",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ProfileBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${Math.min(100, (value / 10) * 100)}%` }}
        />
      </div>
    </div>
  );
}

type Params = { id: string };

export default function ClinicalUserDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<ClinicalUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intervention form state
  const [iType, setIType] = useState<InterventionType>("message");
  const [iContent, setIContent] = useState("");
  const [iNotify, setINotify] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Collapsible sections
  const [showMessages, setShowMessages] = useState(false);
  const [showCrisis, setShowCrisis] = useState(true);

  useEffect(() => {
    void fetch(`/api/admin-clinical/user/${id}`)
      .then(async (res) => {
        if (res.status === 401) { router.push("/admin/login"); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDetail(await res.json() as ClinicalUserDetail);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSendIntervention() {
    if (!iContent.trim()) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/admin-clinical/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, type: iType, content: iContent.trim(), notify: iNotify }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSendSuccess(true);
      setIContent("");
      // Refresh interventions list
      const refreshed = await fetch(`/api/admin-clinical/user/${id}`);
      if (refreshed.ok) setDetail(await refreshed.json() as ClinicalUserDetail);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <AdminShell
      title="Detalle clínico"
      subtitle={detail?.user.email ?? id}
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2">
        <Link
          href="/admin-clinical"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition"
        >
          <ArrowLeft className="size-4" /> Panel clínico
        </Link>
      </div>

      {loading && <div className="text-sm text-zinc-500 p-4">Cargando...</div>}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive p-4">
          <AlertTriangle className="size-4" /> {error}
        </div>
      )}

      {detail && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* User header */}
            <Card>
              <CardContent className="flex flex-wrap items-start gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold truncate">
                      {detail.user.name ?? detail.user.email}
                    </h2>
                    {detail.state?.crisisActive && (
                      <Badge variant="danger" className="gap-1">
                        <ShieldAlert className="size-3" /> Crisis activa
                      </Badge>
                    )}
                    {detail.state && (
                      <Badge variant={RISK_VARIANT[detail.state.riskLevel]}>
                        Riesgo {detail.state.riskLevel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mt-1">{detail.user.id}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Registrado {formatDate(detail.user.createdAt)} · Vía {detail.user.source ?? "web"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <div>Última actividad</div>
                  <div className="font-medium text-white">{formatDate(detail.user.lastSeen)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Emotional state */}
            {detail.state && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Estado emocional</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {[
                    ["Estado", detail.state.state],
                    ["Emoción primaria", detail.state.primaryEmotion],
                    ["Patrón dominante", detail.state.dominantPattern],
                    ["Foco", detail.state.focusArea],
                    ["Energía", detail.state.energyLevel],
                    ["Tendencia", detail.state.progressTrend],
                    ["Mood", detail.state.mood],
                  ].map(([label, value]) => value && (
                    <div key={label}>
                      <div className="text-xs text-zinc-500">{label}</div>
                      <div className="font-medium capitalize">{value}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Emotional profile */}
            {detail.emotionalProfile && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Perfil emocional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ProfileBar label="Claridad" value={detail.emotionalProfile.clarityScore} />
                  <ProfileBar label="Autoestima" value={detail.emotionalProfile.autoestimaScore} />
                  <ProfileBar label="Energía" value={detail.emotionalProfile.energiaScore} />
                  <ProfileBar label="Disciplina" value={detail.emotionalProfile.disciplinaScore} />
                  <ProfileBar label="Social" value={detail.emotionalProfile.socialScore} />
                  <div className="pt-1 text-xs text-zinc-500">
                    Total: <span className="font-semibold text-white">{detail.emotionalProfile.totalScore}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Goals */}
            {detail.goals.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Objetivos ({detail.goals.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detail.goals.map((g) => (
                    <div key={g.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{g.title}</span>
                        <Badge variant="secondary" className="text-xs">{g.status}</Badge>
                      </div>
                      {g.actions.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {g.actions.map((a) => (
                            <li key={a.id} className="flex items-start gap-2 text-xs text-zinc-500">
                              <span className={a.completed ? "text-green-500" : "text-zinc-500"}>
                                {a.completed ? "✓" : "·"}
                              </span>
                              <span className={a.completed ? "line-through" : ""}>{a.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Crisis events */}
            {detail.crisisEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <button
                    className="flex w-full items-center justify-between py-2 text-sm font-semibold text-white"
                    onClick={() => setShowCrisis((v) => !v)}
                  >
                    <span>Eventos de crisis ({detail.crisisEvents.length})</span>
                    {showCrisis ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </CardHeader>
                {showCrisis && (
                  <CardContent className="space-y-3">
                    {detail.crisisEvents.map((c) => (
                      <div key={c.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="danger">{c.level}</Badge>
                          <span className="text-zinc-500">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-white">{c.message}</p>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Messages */}
            <Card>
              <CardHeader className="pb-0">
                <button
                  className="flex w-full items-center justify-between py-2 text-sm font-semibold text-white"
                  onClick={() => setShowMessages((v) => !v)}
                >
                  <span>Historial de mensajes ({detail.messages.length})</span>
                  {showMessages ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </CardHeader>
              {showMessages && (
                <CardContent className="max-h-96 overflow-y-auto space-y-2">
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                          m.role === "user"
                            ? "bg-violet-500 text-white"
                            : "bg-zinc-800 text-white"
                        }`}
                      >
                        <p>{m.content}</p>
                        <p className={`mt-1 text-[10px] opacity-60`}>{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right column — Intervention panel */}
          <div className="space-y-6">
            {/* Send intervention */}
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Enviar intervención</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {INTERVENTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setIType(t.value)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                        iType === t.value
                          ? "border-violet-500/30 bg-violet-500 text-white"
                          : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:bg-zinc-800"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={iContent}
                  onChange={(e) => setIContent(e.target.value)}
                  placeholder="Escribe el mensaje o recomendación para el usuario…"
                  rows={5}
                  className="resize-none text-sm"
                />

                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={iNotify}
                    onChange={(e) => setINotify(e.target.checked)}
                    className="rounded"
                  />
                  Notificar por Telegram si está vinculado
                </label>

                {sendError && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="size-3" /> {sendError}
                  </div>
                )}
                {sendSuccess && (
                  <div className="text-xs text-green-600 font-medium">
                    ✓ Intervención enviada correctamente.
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  disabled={sending || !iContent.trim()}
                  onClick={() => void handleSendIntervention()}
                >
                  <Send className="size-4" />
                  {sending ? "Enviando…" : "Enviar intervención"}
                </Button>
              </CardContent>
            </Card>

            {/* Previous interventions */}
            {detail.interventions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Intervenciones previas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.interventions.map((i) => (
                    <div key={i.id} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="secondary">{i.type}</Badge>
                        <span className="text-zinc-500">{formatDate(i.sentAt)}</span>
                      </div>
                      <p className="text-white">{i.content}</p>
                      <p className="mt-1 text-zinc-500">
                        Estado: <span className="font-medium">{i.status}</span>
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
