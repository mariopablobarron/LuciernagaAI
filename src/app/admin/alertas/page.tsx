"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Clock,
  PlusCircle,
  Send,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  level: "warn" | "error" | "any";
  tagPattern: string | null;
  messagePattern: string | null;
  channel: "telegram" | "email" | "both";
  throttleMinutes: number;
  lastFiredAt: string | null;
  firedCount: number;
  createdAt: string;
};

const EMPTY_FORM = {
  name: "",
  level: "error" as "warn" | "error" | "any",
  tagPattern: "",
  messagePattern: "",
  channel: "telegram" as "telegram" | "email" | "both",
  throttleMinutes: 15,
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertasPage() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setRules(data.items ?? []);
    } catch {
      toast.error("Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Ponle un nombre");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "create_failed");
      }
      toast.success("Regla creada");
      setForm(EMPTY_FORM);
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(rule: Rule) {
    try {
      await fetch(`/api/admin/alerts/${rule.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      void load();
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleDelete(rule: Rule) {
    if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return;
    try {
      await fetch(`/api/admin/alerts/${rule.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success("Regla eliminada");
      void load();
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function handleTest(rule: Rule) {
    setTesting(rule.id);
    try {
      const res = await fetch(`/api/admin/alerts/${rule.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("test_failed");
      toast.success("Alerta de prueba enviada");
    } catch {
      toast.error("Error al enviar prueba — revisa ADMIN_TELEGRAM_ID");
    } finally {
      setTesting(null);
    }
  }

  const levelIcon = (level: string) => {
    if (level === "error") return <AlertCircle className="h-4 w-4 text-red-400" />;
    if (level === "warn") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    return <Zap className="h-4 w-4 text-violet-400" />;
  };

  return (
    <AdminShell
      title="Reglas de alertas"
      subtitle="Dispara notificaciones a Telegram cuando se cumple una condición en los logs. Con throttle para no saturarte."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <AdminPanel
        title="Nueva regla"
        description="Matchea por nivel + tag contenido + mensaje contenido. El throttle evita spam de la misma regla."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="p.ej. Errores de BILLING"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Nivel</label>
            <select
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as Rule["level"] }))}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="any">Cualquier nivel</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Tag contiene <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.tagPattern}
              onChange={(e) => setForm((p) => ({ ...p, tagPattern: e.target.value }))}
              placeholder="p.ej. BILLING, AUTH, CRON"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Mensaje contiene <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.messagePattern}
              onChange={(e) => setForm((p) => ({ ...p, messagePattern: e.target.value }))}
              placeholder="p.ej. webhook_signature, Invalid"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Canal</label>
            <select
              value={form.channel}
              onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value as Rule["channel"] }))}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            >
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Throttle (minutos)</label>
            <input
              type="number"
              min={1}
              max={1440}
              value={form.throttleMinutes}
              onChange={(e) => setForm((p) => ({ ...p, throttleMinutes: Number(e.target.value) || 15 }))}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
            {creating ? "Creando…" : "Crear regla"}
          </button>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Reglas activas"
        description={
          rules ? `${rules.length} reglas · ${rules.filter((r) => r.enabled).length} habilitadas` : "Cargando…"
        }
      >
        {loading && !rules ? (
          <div className="text-sm text-zinc-500 py-8 text-center">Cargando…</div>
        ) : !rules || rules.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            Sin reglas todavía. Crea la primera arriba.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-start gap-3 py-3">
                <button
                  onClick={() => handleToggle(rule)}
                  className={`mt-1 w-10 h-5 rounded-full relative transition-colors ${
                    rule.enabled ? "bg-emerald-500/60" : "bg-zinc-700"
                  }`}
                  title={rule.enabled ? "Habilitada" : "Deshabilitada"}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      rule.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {levelIcon(rule.level)}
                    <p className="text-sm font-bold text-white">{rule.name}</p>
                    <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      {rule.channel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-zinc-500">
                    <span>
                      nivel: <span className="text-zinc-300">{rule.level}</span>
                    </span>
                    <span>
                      tag: <span className="text-zinc-300">{rule.tagPattern ?? "*"}</span>
                    </span>
                    <span>
                      msg: <span className="text-zinc-300">{rule.messagePattern ?? "*"}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      throttle {rule.throttleMinutes}m
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-zinc-600">
                    <span>
                      disparada: <span className="text-zinc-400">{rule.firedCount}</span> veces
                    </span>
                    <span>
                      última: <span className="text-zinc-400">{fmtDate(rule.lastFiredAt)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleTest(rule)}
                    disabled={testing === rule.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs disabled:opacity-50"
                  >
                    <Send className={`h-3 w-3 ${testing === rule.id ? "animate-pulse" : ""}`} />
                    Probar
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs border border-red-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Sugerencias de reglas típicas" description="Copia manualmente las que te interesen.">
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          {[
            {
              name: "Errores de BILLING (Stripe)",
              level: "error",
              tag: "BILLING",
              msg: "",
              why: "Cualquier fallo en webhook de Stripe o facturación",
            },
            {
              name: "Fallos de firma de webhook",
              level: "error",
              tag: "",
              msg: "webhook_signature",
              why: "Detectar intentos maliciosos o config rota",
            },
            {
              name: "Crons que fallan",
              level: "error",
              tag: "CRON",
              msg: "",
              why: "Un cron se rompió — empieza a fallar todo lo programado",
            },
            {
              name: "Errores de AUTH",
              level: "error",
              tag: "AUTH",
              msg: "",
              why: "Errores al registrarse, loguearse o verificar — bloqueador",
            },
            {
              name: "Envíos de email fallidos",
              level: "error",
              tag: "EMAIL",
              msg: "",
              why: "Resend caído o config rota",
            },
            {
              name: "Crisis del usuario",
              level: "any",
              tag: "CRISIS",
              msg: "",
              why: "Aviso de alto riesgo detectado en chat",
            },
          ].map((s) => (
            <button
              key={s.name}
              onClick={() =>
                setForm({
                  name: s.name,
                  level: s.level as Rule["level"],
                  tagPattern: s.tag,
                  messagePattern: s.msg,
                  channel: "telegram",
                  throttleMinutes: 15,
                })
              }
              className="text-left rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 hover:border-violet-500/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm font-semibold text-white">{s.name}</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">{s.why}</p>
              <div className="flex gap-2 mt-2 text-[10px] text-zinc-600 font-mono">
                <span>{s.level}</span>
                {s.tag && <span>· tag~{s.tag}</span>}
                {s.msg && <span>· msg~{s.msg}</span>}
              </div>
            </button>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
