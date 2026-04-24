"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Hourglass, Mail, Sparkles, Heart, MessageSquare, UserPlus } from "lucide-react";

type SnapshotPayload = {
  kind: "snapshot";
  windowDays: number;
  createdAt: string;
  stats: {
    messagesSent: number;
    heartbeats: number;
    dominantState: string | null;
    activeGoalTitle: string | null;
    activeGoalProgress: number | null;
  };
  snippets: Array<{ at: string; preview: string }>;
};

type LetterPayload = {
  kind: "letter";
  createdAt: string;
  text: string;
};

type CapsuleResponse = {
  summary: {
    id: string;
    kind: "snapshot" | "letter";
    status: string;
    createdAt: string;
    deliverAt: string;
    openedAt: string | null;
  };
  payload: SnapshotPayload | LetterPayload;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CapsulaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = useState<CapsuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/capsules/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const detail = await r.json().catch(() => ({}));
          throw new Error(detail.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: CapsuleResponse) => setData(d))
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

  async function fetchInvite() {
    if (inviteLoading || inviteUrl) return;
    setInviteLoading(true);
    try {
      const res = await fetch("/api/user/invites", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { invites?: Array<{ url: string; used: boolean }> };
      const available = json.invites?.find((i) => !i.used);
      if (available) {
        setInviteUrl(available.url);
      } else {
        setInviteUrl("__NONE__");
      }
    } catch {
      setInviteUrl("__ERROR__");
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl || inviteUrl.startsWith("__")) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // navegador sin permiso de clipboard — ignorar
    }
  }

  if (!id) return null;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/app/capsulas")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          </div>
        )}

        {error === "NOT_READY" && (
          <NotReadyBox />
        )}

        {error && error !== "NOT_READY" && (
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-4 text-sm text-rose-300">
            {error === "NOT_FOUND"
              ? "Esta cápsula no existe o no es tuya."
              : error === "NOT_AUTHENTICATED"
                ? "Necesitas iniciar sesión."
                : "No se pudo abrir la cápsula."}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {data.payload.kind === "letter" ? (
              <LetterView payload={data.payload} createdAt={data.summary.createdAt} />
            ) : (
              <SnapshotView payload={data.payload} />
            )}

            <div className="mt-10 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-fuchsia-500/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
                  <UserPlus className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    ¿Conoces a alguien que esté donde estabas tú?
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Esta es tu invitación. Una sola, sin presión.
                  </p>

                  {!inviteUrl && (
                    <button
                      onClick={fetchInvite}
                      disabled={inviteLoading}
                      className="mt-4 rounded-xl bg-violet-500 hover:bg-violet-400 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:bg-zinc-700"
                    >
                      {inviteLoading ? "Buscando..." : "Sacar mi invitación"}
                    </button>
                  )}

                  {inviteUrl === "__NONE__" && (
                    <p className="mt-4 text-xs text-zinc-400">
                      Aún no tienes invitaciones disponibles. Llegarán con el tiempo.
                    </p>
                  )}

                  {inviteUrl === "__ERROR__" && (
                    <p className="mt-4 text-xs text-rose-300">
                      No se pudo obtener la invitación. Inténtalo más tarde.
                    </p>
                  )}

                  {inviteUrl && !inviteUrl.startsWith("__") && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <code className="flex-1 min-w-0 truncate rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 font-mono">
                        {inviteUrl}
                      </code>
                      <button
                        onClick={copyInvite}
                        className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-200 transition-colors"
                      >
                        {inviteCopied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Link
                href="/app"
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Volver al chat
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LetterView({ payload, createdAt }: { payload: LetterPayload; createdAt: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
          <Mail className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold">
            Carta
          </p>
          <p className="text-xs text-zinc-500">
            La escribiste el {formatDate(payload.createdAt)} (creada {formatDate(createdAt)})
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
        <p className="font-serif text-base sm:text-lg text-zinc-100 leading-relaxed whitespace-pre-wrap">
          {payload.text}
        </p>
      </div>
    </div>
  );
}

function SnapshotView({ payload }: { payload: SnapshotPayload }) {
  const stats = payload.stats;
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
          <Sparkles className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold">
            Estampa de hace {payload.windowDays} días
          </p>
          <p className="text-xs text-zinc-500">
            Tomada el {formatDate(payload.createdAt)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
        <p className="text-base text-zinc-100 leading-relaxed">
          Hace {payload.windowDays} días tú estabas{" "}
          {stats.dominantState ? (
            <strong className="text-violet-300">en {stats.dominantState}</strong>
          ) : (
            "aquí"
          )}
          .
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={<MessageSquare className="h-4 w-4" />} value={stats.messagesSent} label="mensajes" />
          <Stat icon={<Heart className="h-4 w-4" />} value={stats.heartbeats} label="latidos" />
          {stats.activeGoalProgress !== null && (
            <Stat
              icon={<Hourglass className="h-4 w-4" />}
              value={`${stats.activeGoalProgress}%`}
              label="progreso del objetivo"
            />
          )}
        </div>

        {stats.activeGoalTitle && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs text-zinc-500">Tu objetivo activo era</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">{stats.activeGoalTitle}</p>
          </div>
        )}

        {payload.snippets.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Cosas que dijiste
            </p>
            <ul className="space-y-3">
              {payload.snippets.map((s, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300 leading-relaxed font-serif"
                >
                  &laquo;{s.preview}&raquo;
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function NotReadyBox() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
        <Hourglass className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-200">Esta cápsula aún no está lista.</p>
      <p className="mt-1 text-xs text-zinc-500">
        Vuelve cuando llegue el día.
      </p>
    </div>
  );
}
