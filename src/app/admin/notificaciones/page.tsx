"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Users, BellRing } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type Audience = "subscribed" | "all-active";

type Stats = {
  subscribedUsers: number;
  activeUsers: number;
};

export default function NotificacionesPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<Audience>("subscribed");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/broadcast/stats", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as Stats;
        setStats(data);
      }
    } catch { /* ignore */ }
  }, [router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  async function handleSend() {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle) { toast.error("El título es obligatorio"); return; }
    if (!cleanBody) { toast.error("El mensaje es obligatorio"); return; }
    if (cleanTitle.length > 80) { toast.error("Título máximo 80 caracteres"); return; }
    if (cleanBody.length > 240) { toast.error("Mensaje máximo 240 caracteres"); return; }

    const recipients = audience === "all-active" ? stats?.activeUsers : stats?.subscribedUsers;
    const audienceLabel = audience === "all-active"
      ? "TODOS los usuarios activos (incluye los que no tienen push activado — solo verán la campana)"
      : "los usuarios con push activado";

    if (!confirm(
      `¿Enviar a ${recipients ?? "?"} destinatarios (${audienceLabel})?\n\n` +
      `Título: ${cleanTitle}\nMensaje: ${cleanBody}`,
    )) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          body: cleanBody,
          url: url.trim() || undefined,
          audience,
          channel: "update",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "send_failed");
      toast.success(`Enviado a ${data.sent} destinatario(s)`);
      setTitle(""); setBody(""); setUrl("");
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell
      title="Notificaciones push"
      subtitle="Envía actualizaciones a los usuarios suscritos"
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-surface rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <BellRing className="w-4 h-4" />
              Suscritos a push
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {stats?.subscribedUsers ?? "—"}
            </div>
          </div>
          <div className="card-surface rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Users className="w-4 h-4" />
              Usuarios activos
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              {stats?.activeUsers ?? "—"}
            </div>
          </div>
        </div>

        <AdminPanel
          title="Nuevo mensaje"
          description="Se envía como push (si tienen permiso) y como notificación en la campana."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Título <span className="text-zinc-500">({title.length}/80)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Novedad en Latidos"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Mensaje <span className="text-zinc-500">({body.length}/240)</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={240}
                rows={3}
                placeholder="Ya puedes... / Acabamos de lanzar..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                URL al pulsar (opcional)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/app o https://..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Por defecto abre la home. Usa rutas internas (/app, /insights...) o URL completas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Audiencia
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value="subscribed"
                    checked={audience === "subscribed"}
                    onChange={() => setAudience("subscribed")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Suscritos a push</div>
                    <div className="text-xs text-zinc-500">
                      Solo los que activaron la campana. Reciben push + notificación in-app.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value="all-active"
                    checked={audience === "all-active"}
                    onChange={() => setAudience("all-active")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">Todos los usuarios activos</div>
                    <div className="text-xs text-zinc-500">
                      Los no suscritos solo verán la campana cuando entren a la app.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
