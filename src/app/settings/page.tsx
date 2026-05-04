'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Send,
  Sparkles,
  User,
  HelpCircle,
} from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';
import { resetAllTours } from '@/components/GuidedTour';
import type { BrowserSessionUser } from '@/lib/session-client';
import { BillingSection } from '@/components/ui/billing-section';
import { TrustedContactSection } from '@/components/ui/trusted-contact-section';
import { PrivacySettings } from '@/components/ui/privacy-settings';
import AgeRangeSection from '@/components/AgeRangeSection';

// ─── Types ────────────────────────────────────────────────────────────────────

type TelegramStatus = {
  linked: boolean;
  telegramId: string | null;
  botUsername: string;
};

type Preferences = {
  aiTone: string;
  reminderTime: string | null;
  reminderEnabled: boolean;
  weeklyEmailEnabled: boolean;
  weeklyLetterDisabled: boolean;
  weeklyLetterEmailDisabled: boolean;
  notifyInsights: boolean;
  notifyGoals: boolean;
  notifyUpdates: boolean;
  genderForm: "feminine" | "masculine" | "neutral" | null;
  timezone: string;
};

const GENDER_FORMS = [
  { value: 'feminine', label: 'Femenino', desc: '"estás cansada"' },
  { value: 'masculine', label: 'Masculino', desc: '"estás cansado"' },
  { value: 'neutral', label: 'Neutro', desc: 'Sin conjugaciones de género ("estás en un momento de cansancio")' },
] as const;

type PasswordForm = { current: string; next: string; confirm: string };

const AI_TONES = [
  { value: 'directo', label: 'Directo', desc: 'Va al grano, sin rodeos' },
  { value: 'socratico', label: 'Socrático', desc: 'Te guía con preguntas' },
  { value: 'calido', label: 'Cálido', desc: 'Empático y cercano' },
] as const;

const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
] as const;

// ─── Toggle Component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 ${
        checked ? 'bg-violet-600' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser] = useState<BrowserSessionUser | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current);
    };
  }, []);

  // Load data
  useEffect(() => {
    fetch('/api/auth/token', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { user?: BrowserSessionUser }) => { if (d.user) setUser(d.user); })
      .catch(() => { toast.error('No se pudo cargar tu perfil'); });

    fetch('/api/user/telegram-status', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: TelegramStatus | null) => { if (d?.linked !== undefined) setTelegram(d); })
      .catch(() => { /* Telegram status is optional */ });

    fetch('/api/user/preferences', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { preferences?: Preferences } | null) => { if (d?.preferences) setPrefs(d.preferences); })
      .catch(() => { toast.error('No se pudieron cargar las preferencias'); });

    fetch('/api/user/profile', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { profile?: { name: string | null; bio: string | null; phone: string | null; hasAvatar: boolean } } | null) => {
        if (d?.profile) {
          setProfileName(d.profile.name ?? '');
          setProfileBio(d.profile.bio ?? '');
          setProfilePhone(d.profile.phone ?? '');
          setHasAvatar(d.profile.hasAvatar);
        }
      })
      .catch(() => {});
  }, []);

  // Save preferences
  const savePrefs = useCallback(async (patch: Partial<Preferences>) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { preferences: Preferences };
      if (res.ok) {
        setPrefs(data.preferences);
        setSaveMsg('Guardado');
        if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current);
        saveMsgTimerRef.current = setTimeout(() => setSaveMsg(null), 2000);
      }
    } catch {
      setSaveMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  }, []);

  // Update a single preference
  const updatePref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => p ? { ...p, [key]: value } : p);
    savePrefs({ [key]: value });
  }, [savePrefs]);

  // Password change
  async function handleChangePassword(e: React.SyntheticEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'error', text: 'Mínimo 8 caracteres.' });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current: pwForm.current, next: pwForm.next }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        const msgs: Record<string, string> = {
          CURRENT_REQUIRED: 'Introduce tu contraseña actual.',
          INVALID_CREDENTIALS: 'La contraseña actual no es correcta.',
          PASSWORD_TOO_SHORT: 'Mínimo 8 caracteres.',
        };
        setPwMsg({ type: 'error', text: msgs[data.error ?? ''] ?? 'Error al cambiar la contraseña.' });
      } else {
        setPwMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        setPwForm({ current: '', next: '', confirm: '' });
        setShowPwForm(false);
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Error al cambiar la contraseña.' });
    } finally {
      setPwLoading(false);
    }
  }


  // Save profile
  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const body: Record<string, unknown> = {
        name: profileName,
        bio: profileBio,
        phone: profilePhone,
      };
      if (avatarPreview !== null) body.avatarData = avatarPreview;
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = (await res.json()) as { profile: { hasAvatar: boolean } };
        setHasAvatar(d.profile.hasAvatar);
        setAvatarPreview(null);
        setProfileMsg('Perfil guardado');
        setTimeout(() => setProfileMsg(null), 2500);
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(err.message ?? 'Error al guardar el perfil');
      }
    } catch {
      toast.error('Error al guardar el perfil');
    } finally {
      setProfileSaving(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error('La imagen debe ser menor de 200 KB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    setHasAvatar(false);
    // Send null avatar on next save
    setProfileSaving(true);
    fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ avatarData: null }),
    }).then((res) => {
      if (res.ok) {
        setProfileMsg('Avatar eliminado');
        setTimeout(() => setProfileMsg(null), 2500);
      }
    }).catch(() => {}).finally(() => setProfileSaving(false));
  }

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : (parts[0]?.[0] ?? '?').toUpperCase();
  };

  const avatarSrc = avatarPreview ?? (hasAvatar && user?.id ? `/api/user/avatar/${user.id}?t=${Date.now()}` : null);

  const botUrl = telegram?.botUsername ? `https://t.me/${telegram.botUsername}` : 'https://t.me/';

  return (
    <div className={`bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Configuración</h1>
          </div>
          {saveMsg && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveMsg}
            </span>
          )}
        </div>

        {/* ── Tu perfil ──────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <User className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Tu perfil</h2>
                <p className="text-xs text-zinc-500">Nombre, foto y datos personales</p>
              </div>
            </div>
            {profileMsg && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> {profileMsg}
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white border-2 border-zinc-700">
                  {initials(profileName || user?.name || '')}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Cambiar foto
              </button>
              {(hasAvatar || avatarPreview) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="block text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Eliminar foto
                </button>
              )}
              <p className="text-[10px] text-zinc-600">PNG, JPEG o WebP. Max 200 KB.</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Nombre</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                maxLength={100}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Bio</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Cuéntanos sobre ti..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-right text-[10px] text-zinc-600">{profileBio.length}/500</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">Teléfono</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                maxLength={20}
                placeholder="+34 612 345 678"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileSaving ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>

        {/* ── AI Coach ──────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Coach IA</h2>
              <p className="text-xs text-zinc-500">Personaliza cómo te habla tu mentor</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">Tono de conversación</p>
            <div className="grid grid-cols-3 gap-2">
              {AI_TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => updatePref('aiTone', tone.value)}
                  disabled={saving}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    prefs?.aiTone === tone.value
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{tone.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{tone.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <p className="text-sm font-medium text-zinc-300">¿Cómo prefieres que te hablemos?</p>
            <p className="text-[11px] text-zinc-500">
              Define la conjugación gramatical del mentor cuando se dirige a ti. Puedes cambiarlo cuando quieras.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_FORMS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => updatePref('genderForm', g.value)}
                  disabled={saving}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    prefs?.genderForm === g.value
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{g.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{g.desc}</p>
                </button>
              ))}
            </div>
            {prefs?.genderForm && (
              <button
                onClick={() => updatePref('genderForm', null)}
                disabled={saving}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline mt-1"
              >
                Quitar preferencia (volver a sin definir)
              </button>
            )}
          </div>
        </div>

        {/* ── Subscription (BillingSection modular: plan + consumo + upgrade/portal) ── */}
        <BillingSection />

        {/* ── Trusted contact (RGPD + notificaciones a persona de confianza) ── */}
        <TrustedContactSection />

        {/* ── Notifications ──────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Bell className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
              <p className="text-xs text-zinc-500">Controla qué te enviamos y cuándo</p>
            </div>
          </div>

          {prefs ? (
            <div className="space-y-1 divide-y divide-zinc-800/60">
              {/* Reminder */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Recordatorios diarios</p>
                  <p className="text-xs text-zinc-500">Check-in y acciones pendientes</p>
                </div>
                <Toggle checked={prefs.reminderEnabled} onChange={(v) => updatePref('reminderEnabled', v)} disabled={saving} />
              </div>

              {/* Reminder Time */}
              {prefs.reminderEnabled && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">Hora del recordatorio</p>
                      <p className="text-xs text-zinc-500">Recibirás el recordatorio a esta hora</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={prefs.reminderTime ?? '09:00'}
                    onChange={(e) => updatePref('reminderTime', e.target.value)}
                    disabled={saving}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              )}

              {/* Weekly email */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Resumen semanal por email</p>
                  <p className="text-xs text-zinc-500">Tu progreso de la semana cada domingo</p>
                </div>
                <Toggle checked={prefs.weeklyEmailEnabled} onChange={(v) => updatePref('weeklyEmailEnabled', v)} disabled={saving} />
              </div>

              {/* Weekly letter — in-app */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-white">Carta del domingo</p>
                  <p className="text-xs text-zinc-500">
                    Una carta breve del mentor cada domingo con tus propias palabras de la semana.
                    El contenido siempre está en la app.
                  </p>
                </div>
                <Toggle
                  checked={!prefs.weeklyLetterDisabled}
                  onChange={(v) => updatePref('weeklyLetterDisabled', !v)}
                  disabled={saving}
                />
              </div>

              {/* Weekly letter email notification */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-white">Aviso por email de la carta</p>
                  <p className="text-xs text-zinc-500">
                    Te avisamos cuando la carta esté lista. El email no contiene la carta — solo un enlace.
                  </p>
                </div>
                <Toggle
                  checked={!prefs.weeklyLetterEmailDisabled}
                  onChange={(v) => updatePref('weeklyLetterEmailDisabled', !v)}
                  disabled={saving || prefs.weeklyLetterDisabled}
                />
              </div>

              {/* Insights */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Nuevos insights</p>
                  <p className="text-xs text-zinc-500">Cuando tengas nuevas recomendaciones</p>
                </div>
                <Toggle checked={prefs.notifyInsights} onChange={(v) => updatePref('notifyInsights', v)} disabled={saving} />
              </div>

              {/* Goals */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Objetivos completados</p>
                  <p className="text-xs text-zinc-500">Celebraciones cuando termines un objetivo</p>
                </div>
                <Toggle checked={prefs.notifyGoals} onChange={(v) => updatePref('notifyGoals', v)} disabled={saving} />
              </div>

              {/* Updates */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Actualizaciones del producto</p>
                  <p className="text-xs text-zinc-500">Nuevas funciones y mejoras</p>
                </div>
                <Toggle checked={prefs.notifyUpdates} onChange={(v) => updatePref('notifyUpdates', v)} disabled={saving} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-zinc-800/50 animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* ── Telegram ──────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#229ED9]/15 flex items-center justify-center">
              <Send className="w-4 h-4 text-[#229ED9]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Telegram</h2>
              <p className="text-xs text-zinc-500">Recibe recordatorios y chatea fuera de la app</p>
            </div>
          </div>

          {telegram === null ? (
            <div className="h-14 rounded-xl bg-zinc-800/50 animate-pulse" />
          ) : telegram.linked ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Cuenta conectada</p>
                <p className="text-xs text-zinc-500 mt-0.5">Ya recibes mensajes y recordatorios en Telegram.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Cómo conectar</p>
                <ol className="space-y-2">
                  {[
                    'Abre el bot en Telegram',
                    'Pulsa Iniciar o escribe /start',
                    'Envía el comando /vincular',
                    'Haz clic en el enlace que te mande el bot',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>
              </div>
              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-[#229ED9] hover:bg-[#1a8bc4] transition-colors"
              >
                <Send className="w-4 h-4" />
                Abrir bot en Telegram
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          )}
        </div>

        {/* ── Timezone ──────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Globe className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Región</h2>
              <p className="text-xs text-zinc-500">Afecta a la hora de los recordatorios</p>
            </div>
          </div>

          {prefs && (
            <select
              value={prefs.timezone}
              onChange={(e) => updatePref('timezone', e.target.value)}
              disabled={saving}
              className={`${COMPONENTS.inputField} w-full`}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Age range ──────────────────────────────────────────────── */}
        <AgeRangeSection />

        {/* ── Security ───────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Seguridad</h2>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {!showPwForm ? (
              <button
                onClick={() => { setShowPwForm(true); setPwMsg(null); }}
                className={`${COMPONENTS.buttonSecondary} w-full`}
              >
                Cambiar contraseña
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 rounded-xl border border-zinc-700/50 p-4">
                <p className="text-sm font-semibold text-white">Cambiar contraseña</p>
                {pwMsg && (
                  <div className={`rounded-lg px-3 py-2 text-sm ${pwMsg.type === 'success' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>
                    {pwMsg.text}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Contraseña actual</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} value={pwForm.current} required
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      placeholder="••••••••" className={`${COMPONENTS.inputField} pr-10 py-2 text-sm`}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Nueva contraseña</label>
                  <input
                    type={showPw ? 'text' : 'password'} value={pwForm.next} required minLength={8}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    placeholder="Mínimo 8 caracteres" className={`${COMPONENTS.inputField} py-2 text-sm`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Confirmar nueva</label>
                  <input
                    type={showPw ? 'text' : 'password'} value={pwForm.confirm} required
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    placeholder="••••••••" className={`${COMPONENTS.inputField} py-2 text-sm`}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={pwLoading}
                    className={`${COMPONENTS.buttonPrimary} flex-1 py-2 text-sm disabled:opacity-60`}>
                    {pwLoading ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => { setShowPwForm(false); setPwMsg(null); }}
                    className={`${COMPONENTS.buttonSecondary} px-4 py-2 text-sm`}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Help ────────────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-fuchsia-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Ayuda</h2>
          </div>
          <button
            onClick={() => {
              resetAllTours();
              toast.success('Tour reiniciado — vuelve al chat para verlo');
            }}
            className={`${COMPONENTS.buttonSecondary} w-full`}
          >
            Repetir el tour guiado
          </button>
        </div>

        {/* ── Privacidad: export de datos + borrado de cuenta ────────── */}
        <PrivacySettings />
      </div>
    </div>
  );
}
