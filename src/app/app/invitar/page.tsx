"use client";

import { useEffect, useState } from "react";
import {
  Gift, Copy, Check, Users, Share2, Heart, Flame, Target,
  MessageCircle, ExternalLink,
} from "lucide-react";

type Invite = {
  code: string;
  url: string;
  used: boolean;
  usedByEmail: string | null;
  createdAt: string;
};

type InvitesData = {
  invites: Invite[];
  total: number;
  available: number;
};

const MILESTONES = [
  { icon: Flame, label: "7 dias de racha", desc: "Mantén tu racha 7 dias seguidos", reward: "1 invitacion" },
  { icon: Target, label: "30 dias de racha", desc: "Un mes completo sin fallar", reward: "1 invitacion" },
  { icon: Heart, label: "Primer objetivo completado", desc: "Completa un objetivo con todas sus acciones", reward: "1 invitacion (pronto)" },
  { icon: MessageCircle, label: "30 dias activo", desc: "Lleva 30 dias usando la plataforma", reward: "1 invitacion (pronto)" },
];

export default function InvitarPage() {
  const [data, setData] = useState<InvitesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/invites", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData({ invites: d.invites ?? [], total: d.total ?? 0, available: d.available ?? 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCopy(url: string, code: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = url; document.body.appendChild(input);
      input.select(); document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }

  async function handleShare(url: string) {
    if (navigator.share) {
      await navigator.share({
        title: "Tres Mil Millones de Latidos",
        text: "Te invito a descubrir tu direccion. Un espacio para entenderte, decidir y avanzar.",
        url,
      }).catch(() => {});
    }
  }

  const available = data?.invites.filter((i) => !i.used) ?? [];
  const used = data?.invites.filter((i) => i.used) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
          <Gift className="h-8 w-8 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Invita a alguien</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Cada invitacion es un latido que compartes. Cuando alguien que te importa
          necesita claridad, puedes darle acceso directo.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-white">{data?.total ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total ganadas</p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center">
              <p className="text-2xl font-bold text-violet-300">{available.length}</p>
              <p className="text-[10px] text-violet-400 uppercase tracking-wider">Disponibles</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{used.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Usadas</p>
            </div>
          </div>

          {/* Available invites */}
          {available.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Tus invitaciones disponibles</h2>
              {available.map((inv) => (
                <div key={inv.code} className="card-surface rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-500 font-mono truncate">{inv.url}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                        <button
                          onClick={() => handleShare(inv.url)}
                          className="rounded-lg bg-violet-500/20 p-2 text-violet-400 hover:bg-violet-500/30 transition-colors"
                          title="Compartir"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(inv.url, inv.code)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                          copiedCode === inv.code
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-violet-500 text-white hover:bg-violet-400"
                        }`}
                      >
                        {copiedCode === inv.code ? (
                          <><Check className="h-3.5 w-3.5" /> Copiado</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copiar enlace</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-surface rounded-xl border border-dashed border-zinc-700 p-8 text-center space-y-2">
              <Gift className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">No tienes invitaciones disponibles todavia</p>
              <p className="text-xs text-zinc-600">Completa hitos para desbloquear invitaciones</p>
            </div>
          )}

          {/* Used invites */}
          {used.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Personas que invitaste ({used.length})
              </h2>
              {used.map((inv) => (
                <div key={inv.code} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{inv.usedByEmail || "Usuario registrado"}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(inv.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* How to earn */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Como conseguir invitaciones</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {MILESTONES.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-violet-400" />
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{m.desc}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                      <Gift className="h-3 w-3" /> {m.reward}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
