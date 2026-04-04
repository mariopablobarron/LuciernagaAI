"use client";

import { useEffect, useState } from "react";
import { Heart, Mail, Phone, Trash2, Send, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  relation?: string | null;
  shareProgress: boolean;
  shareWins: boolean;
  shareStreak: boolean;
  notifyOnCrisis: boolean;
  notifyOnInactivity: boolean;
  inactivityDays: number;
  inviteSentAt?: string | null;
  lastAccessAt?: string | null;
};

const RELATIONS = ["madre", "padre", "pareja", "amigo/a", "hermano/a", "terapeuta", "otro"] as const;

export default function FamilySettings() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState<string>("otro");
  const [shareProgress, setShareProgress] = useState(false);
  const [shareWins, setShareWins] = useState(false);
  const [shareStreak, setShareStreak] = useState(false);
  const [notifyOnCrisis, setNotifyOnCrisis] = useState(true);
  const [notifyOnInactivity, setNotifyOnInactivity] = useState(true);
  const [inactivityDays, setInactivityDays] = useState(3);

  useEffect(() => {
    fetch("/api/user/trusted-contact", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { contact?: Contact | null }) => {
        if (data.contact) {
          setContact(data.contact);
          populate(data.contact);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function populate(c: Contact) {
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone ?? "");
    setRelation(c.relation ?? "otro");
    setShareProgress(c.shareProgress);
    setShareWins(c.shareWins);
    setShareStreak(c.shareStreak);
    setNotifyOnCrisis(c.notifyOnCrisis);
    setNotifyOnInactivity(c.notifyOnInactivity);
    setInactivityDays(c.inactivityDays);
  }

  async function handleSave() {
    if (!name.trim() || !email.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        name, email, phone: phone || null, relation,
        shareProgress, shareWins, shareStreak,
        notifyOnCrisis, notifyOnInactivity, inactivityDays,
      };
      const method = contact ? "PATCH" : "POST";
      const res = await fetch("/api/user/trusted-contact", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { contact?: Contact };
      if (data.contact) {
        setContact(data.contact);
        populate(data.contact);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResendInvite() {
    if (!contact) return;
    await fetch("/api/user/trusted-contact", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resendInvite: true }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    if (!contact || !confirm(`¿Eliminar a ${contact.name} como contacto de confianza?`)) return;
    setDeleting(true);
    try {
      await fetch("/api/user/trusted-contact", { method: "DELETE", credentials: "include" });
      setContact(null);
      setName(""); setEmail(""); setPhone(""); setRelation("otro");
      setShareProgress(false); setShareWins(false); setShareStreak(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando configuración familiar…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400" />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Red de apoyo familiar</p>
            <p className="text-xs text-muted-foreground">
              {contact
                ? `${contact.name} · ${contact.relation ?? "contacto de confianza"}`
                : "Sin contacto configurado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact && (
            <Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">
              Activo
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <Separator />

          {/* Basic info */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Datos de contacto
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-2 h-9 text-sm"
              />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-2 h-9 text-sm"
              />
              <div className="relative col-span-1">
                <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Teléfono (opcional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* What to share */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Qué puede ver
            </p>
            {(
              [
                { key: "shareProgress", label: "Tendencia emocional y objetivo", state: shareProgress, set: setShareProgress },
                { key: "shareWins", label: "Victorias que yo comparta", state: shareWins, set: setShareWins },
                { key: "shareStreak", label: "Racha de constancia", state: shareStreak, set: setShareStreak },
              ] as const
            ).map((item) => (
              <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5">
                <span className="text-sm text-foreground">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.state}
                  onChange={(e) => item.set(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            ))}
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cuándo notificar
            </p>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5">
              <span className="text-sm text-foreground">Alertar en crisis detectada</span>
              <input
                type="checkbox"
                checked={notifyOnCrisis}
                onChange={(e) => setNotifyOnCrisis(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5">
              <span className="text-sm text-foreground">Alertar por inactividad</span>
              <input
                type="checkbox"
                checked={notifyOnInactivity}
                onChange={(e) => setNotifyOnInactivity(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
            </label>
            {notifyOnInactivity && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
                <span className="flex-1 text-sm text-foreground">Días sin actividad para alertar</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(Number(e.target.value))}
                  className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center text-sm"
                />
              </div>
            )}
          </div>

          {/* Portal status */}
          {contact?.lastAccessAt && (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <Mail className="mr-1.5 inline h-3.5 w-3.5" />
              Último acceso al portal:{" "}
              {new Date(contact.lastAccessAt).toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !name.trim() || !email.trim()}
              className="flex-1"
              size="sm"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              {saved ? "Guardado" : contact ? "Actualizar" : "Añadir contacto"}
            </Button>

            {contact && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleResendInvite()}
                title="Reenviar email de invitación"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}

            {contact && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
