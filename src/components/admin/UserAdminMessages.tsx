"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Mail, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AdminMessage = {
  id: string;
  subject: string;
  body: string;
  channels: string[];
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdByAdmin: string | null;
};

type Props = {
  userId: string;
  userEmail: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function StatusTicks({ delivered, read }: { delivered: boolean; read: boolean }) {
  if (read) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400" title="Leído">
        <CheckCheck className="h-3.5 w-3.5" />
        <span className="text-[11px]">Leído</span>
      </span>
    );
  }
  if (delivered) {
    return (
      <span className="inline-flex items-center gap-1 text-zinc-400" title="Entregado">
        <Check className="h-3.5 w-3.5" />
        <span className="text-[11px]">Entregado</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-zinc-600" title="Enviando">
      <Check className="h-3.5 w-3.5" />
      <span className="text-[11px]">Enviando…</span>
    </span>
  );
}

export default function UserAdminMessages({ userId, userEmail }: Props) {
  const [items, setItems] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/messages`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items: AdminMessage[] };
      setItems(json.items);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setFeedback({ type: "error", text: "Asunto y cuerpo son obligatorios." });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/messages`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), sendEmail }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || `HTTP ${res.status}`);
      }
      setFeedback({
        type: "ok",
        text: payload.delivered ? "Entregado." : "Registrado (algún canal falló — revisar logs).",
      });
      setSubject("");
      setBody("");
      void load();
    } catch (err) {
      setFeedback({ type: "error", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const emailDisabled = !userEmail || userEmail.endsWith("@session.latidos.local") || userEmail.endsWith("@session.luciernaga.local");

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-violet-400" />
          Mensajes directos al usuario
        </CardTitle>
        <CardDescription>Aparece como sobre en su bandeja + email (opcional).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Asunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={180}
              placeholder="Asunto breve"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Mensaje</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              rows={5}
              placeholder="Escríbele con tu voz. Se mostrará como 'Mensaje del equipo', separado del mentor."
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
            <p className="mt-1 text-[10px] text-zinc-600">{body.length} / 8000</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className={`inline-flex items-center gap-2 text-xs ${emailDisabled ? "text-zinc-600" : "text-zinc-400"}`}>
              <input
                type="checkbox"
                checked={sendEmail && !emailDisabled}
                disabled={emailDisabled}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-600"
              />
              Enviar también por email {emailDisabled && "(sin email válido)"}
            </label>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {sending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
          {feedback && (
            <p className={feedback.type === "ok" ? "text-xs text-emerald-400" : "text-xs text-red-400"}>
              {feedback.text}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Historial</p>
          {loading && <p className="text-xs text-zinc-500">Cargando…</p>}
          {error && <p className="text-xs text-red-400">Error: {error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="text-xs text-zinc-600">Aún no has enviado ningún mensaje a este usuario.</p>
          )}
          {items.map((m) => (
            <div key={m.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-zinc-100">{m.subject}</p>
                <StatusTicks delivered={!!m.deliveredAt} read={!!m.readAt} />
              </div>
              <p className="mt-1 text-xs text-zinc-500 line-clamp-2 whitespace-pre-wrap">{m.body}</p>
              <div className="mt-2 flex gap-3 text-[10px] text-zinc-600">
                <span>{formatDate(m.sentAt)}</span>
                <span>·</span>
                <span>{m.channels.includes("email") ? "In-app + email" : "Solo in-app"}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
