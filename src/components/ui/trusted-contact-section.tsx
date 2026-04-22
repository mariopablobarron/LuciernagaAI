"use client";

import React, { useEffect, useState } from "react";
import { Users, Mail, Phone, Trash2, Send, CheckCircle2, AlertTriangle } from "lucide-react";

type Relation = "madre" | "padre" | "pareja" | "amigo/a" | "hermano/a" | "terapeuta" | "otro";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relation: string | null;
  shareProgress: boolean;
  shareWins: boolean;
  shareStreak: boolean;
  notifyOnCrisis: boolean;
  notifyOnInactivity: boolean;
  inactivityDays: number;
  inviteSentAt: string | null;
  lastAccessAt: string | null;
};

const RELATIONS: Relation[] = ["madre", "padre", "pareja", "amigo/a", "hermano/a", "terapeuta", "otro"];

export function TrustedContactSection() {
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    relation: "" as "" | Relation,
    shareProgress: false,
    shareWins: false,
    shareStreak: false,
    notifyOnCrisis: true,
    notifyOnInactivity: true,
    inactivityDays: 3,
  });

  useEffect(() => {
    fetch("/api/user/trusted-contact")
      .then((r) => r.json())
      .then((data: { contact: Contact | null }) => {
        setContact(data.contact);
        if (data.contact) {
          setForm({
            name: data.contact.name,
            email: data.contact.email,
            phone: data.contact.phone ?? "",
            relation: (data.contact.relation as Relation | null) ?? "",
            shareProgress: data.contact.shareProgress,
            shareWins: data.contact.shareWins,
            shareStreak: data.contact.shareStreak,
            notifyOnCrisis: data.contact.notifyOnCrisis,
            notifyOnInactivity: data.contact.notifyOnInactivity,
            inactivityDays: data.contact.inactivityDays,
          });
        }
      })
      .catch(() => setFeedback({ kind: "error", text: "No pudimos cargar tu contacto." }))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const method = contact ? "PATCH" : "POST";
    const body = {
      ...form,
      relation: form.relation || null,
      phone: form.phone || null,
    };

    try {
      const res = await fetch("/api/user/trusted-contact", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error guardando");
      setContact(data.contact);
      setFeedback({
        kind: "ok",
        text: contact ? "Cambios guardados." : "Contacto creado. Le enviamos un email con su enlace.",
      });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/trusted-contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendInvite: true }),
      });
      if (!res.ok) throw new Error("No se pudo reenviar");
      setFeedback({ kind: "ok", text: "Email de invitación reenviado." });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/trusted-contact", { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      setContact(null);
      setConfirmDelete(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        relation: "",
        shareProgress: false,
        shareWins: false,
        shareStreak: false,
        notifyOnCrisis: true,
        notifyOnInactivity: true,
        inactivityDays: 3,
      });
      setFeedback({ kind: "ok", text: "Contacto eliminado." });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-500">Cargando…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
      <header className="flex items-start gap-3">
        <Users className="w-5 h-5 text-fuchsia-400 mt-1 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold">Contacto de confianza</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Una persona que recibe avisos si estás en crisis o llevas días sin aparecer.
            Puede ver solo lo que tú decidas.
          </p>
        </div>
      </header>

      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            feedback.kind === "ok"
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
              : "border-red-800 bg-red-950/40 text-red-300"
          }`}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-zinc-400">Nombre</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Ej. Ana"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400">Relación</span>
            <select
              value={form.relation}
              onChange={(e) => setForm({ ...form, relation: e.target.value as "" | Relation })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="ana@ejemplo.com"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Teléfono (opcional)
            </span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="+34 600 000 000"
            />
          </label>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Qué puede ver
          </legend>

          <Toggle
            label="Progreso emocional y objetivos"
            checked={form.shareProgress}
            onChange={(v) => setForm({ ...form, shareProgress: v })}
          />
          <Toggle
            label="Victorias que registras"
            checked={form.shareWins}
            onChange={(v) => setForm({ ...form, shareWins: v })}
          />
          <Toggle
            label="Hitos de racha"
            checked={form.shareStreak}
            onChange={(v) => setForm({ ...form, shareStreak: v })}
          />
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Cuándo avisarle
          </legend>

          <Toggle
            label="Si detectamos crisis"
            checked={form.notifyOnCrisis}
            onChange={(v) => setForm({ ...form, notifyOnCrisis: v })}
          />
          <Toggle
            label="Si llevas días sin aparecer"
            checked={form.notifyOnInactivity}
            onChange={(v) => setForm({ ...form, notifyOnInactivity: v })}
          />

          {form.notifyOnInactivity && (
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <span>Tras</span>
              <input
                type="number"
                min={1}
                max={30}
                value={form.inactivityDays}
                onChange={(e) =>
                  setForm({ ...form, inactivityDays: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })
                }
                className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-center"
              />
              <span>días sin actividad</span>
            </label>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {saving ? "Guardando…" : contact ? "Guardar cambios" : "Crear contacto"}
          </button>

          {contact && (
            <>
              <button
                type="button"
                onClick={resendInvite}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Reenviar invitación
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm">
                  <span className="text-red-200">¿Seguro?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {contact && (
          <p className="text-xs text-zinc-500 pt-1">
            {contact.lastAccessAt
              ? `Último acceso al portal: ${new Date(contact.lastAccessAt).toLocaleDateString("es-ES")}`
              : contact.inviteSentAt
              ? `Invitación enviada: ${new Date(contact.inviteSentAt).toLocaleDateString("es-ES")} · aún no ha entrado`
              : null}
          </p>
        )}
      </form>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-zinc-200 cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-fuchsia-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
