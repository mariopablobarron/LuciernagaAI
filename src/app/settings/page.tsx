'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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

// IDs estables — labels y descriptions vienen de messages.settings.coach.*
const GENDER_FORM_IDS = ['feminine', 'masculine', 'neutral'] as const;

type PasswordForm = { current: string; next: string; confirm: string };

const AI_TONE_IDS = ['directo', 'socratico', 'calido'] as const;

// IDs estables; labels vienen de messages.settings.region.timezones.<id>.
const TIMEZONES = [
  { value: 'Europe/Madrid', id: 'madrid' },
  { value: 'Europe/London', id: 'london' },
  { value: 'America/Mexico_City', id: 'mexico' },
  { value: 'America/Bogota', id: 'bogota' },
  { value: 'America/Lima', id: 'lima' },
  { value: 'America/Santiago', id: 'santiago' },
  { value: 'America/Argentina/Buenos_Aires', id: 'buenosAires' },
  { value: 'America/New_York', id: 'newYork' },
  { value: 'America/Los_Angeles', id: 'losAngeles' },
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
  const t = useTranslations('settings');
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
      .catch(() => { toast.error(t('loadErrorProfile')); });

    fetch('/api/user/telegram-status', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: TelegramStatus | null) => { if (d?.linked !== undefined) setTelegram(d); })
      .catch(() => { /* Telegram status is optional */ });

    fetch('/api/user/preferences', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { preferences?: Preferences } | null) => { if (d?.preferences) setPrefs(d.preferences); })
      .catch(() => { toast.error(t('loadErrorPrefs')); });

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
  }, [t]);

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
        setSaveMsg(t('saved'));
        if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current);
        saveMsgTimerRef.current = setTimeout(() => setSaveMsg(null), 2000);
      }
    } catch {
      setSaveMsg(t('saveError'));
    } finally {
      setSaving(false);
    }
  }, [t]);

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
      setPwMsg({ type: 'error', text: t('security.errorMismatch') });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'error', text: t('security.errorTooShort') });
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
          CURRENT_REQUIRED: t('security.errorCurrentRequired'),
          INVALID_CREDENTIALS: t('security.errorInvalidCredentials'),
          PASSWORD_TOO_SHORT: t('security.errorTooShort'),
        };
        setPwMsg({ type: 'error', text: msgs[data.error ?? ''] ?? t('security.errorGeneric') });
      } else {
        setPwMsg({ type: 'success', text: t('security.successChanged') });
        setPwForm({ current: '', next: '', confirm: '' });
        setShowPwForm(false);
      }
    } catch {
      setPwMsg({ type: 'error', text: t('security.errorGeneric') });
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
        setProfileMsg(t('profile.saved'));
        setTimeout(() => setProfileMsg(null), 2500);
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(err.message ?? t('profile.saveError'));
      }
    } catch {
      toast.error(t('profile.saveError'));
    } finally {
      setProfileSaving(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error(t('profile.avatarTooLarge'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.avatarInvalidType'));
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
        setProfileMsg(t('profile.avatarRemoved'));
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
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>{t('title')}</h1>
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
                <h2 className="text-lg font-semibold text-white">{t('profile.title')}</h2>
                <p className="text-xs text-zinc-500">{t('profile.subtitle')}</p>
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
                <img src={avatarSrc} alt={t('profile.avatarAlt')} className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700" />
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
                {t('profile.changePhoto')}
              </button>
              {(hasAvatar || avatarPreview) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="block text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  {t('profile.removePhoto')}
                </button>
              )}
              <p className="text-[10px] text-zinc-600">{t('profile.avatarHint')}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">{t('profile.nameLabel')}</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                maxLength={100}
                placeholder={t('profile.namePlaceholder')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">{t('profile.bioLabel')}</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t('profile.bioPlaceholder')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-right text-[10px] text-zinc-600">{t('profile.bioCounterTpl', { n: profileBio.length })}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">{t('profile.phoneLabel')}</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                maxLength={20}
                placeholder={t('profile.phonePlaceholder')}
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
            {profileSaving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>

        {/* ── AI Coach ──────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('coach.title')}</h2>
              <p className="text-xs text-zinc-500">{t('coach.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">{t('coach.toneTitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              {AI_TONE_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => updatePref('aiTone', id)}
                  disabled={saving}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    prefs?.aiTone === id
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{t(`coach.tones.${id}.label`)}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{t(`coach.tones.${id}.desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <p className="text-sm font-medium text-zinc-300">{t('coach.genderTitle')}</p>
            <p className="text-[11px] text-zinc-500">{t('coach.genderHint')}</p>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_FORM_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => updatePref('genderForm', id)}
                  disabled={saving}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    prefs?.genderForm === id
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{t(`coach.genders.${id}.label`)}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{t(`coach.genders.${id}.desc`)}</p>
                </button>
              ))}
            </div>
            {prefs?.genderForm && (
              <button
                onClick={() => updatePref('genderForm', null)}
                disabled={saving}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline mt-1"
              >
                {t('coach.clearGender')}
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
              <h2 className="text-lg font-semibold text-white">{t('notifications.title')}</h2>
              <p className="text-xs text-zinc-500">{t('notifications.subtitle')}</p>
            </div>
          </div>

          {prefs ? (
            <div className="space-y-1 divide-y divide-zinc-800/60">
              {/* Reminder */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('notifications.dailyReminders')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.dailyRemindersDesc')}</p>
                </div>
                <Toggle checked={prefs.reminderEnabled} onChange={(v) => updatePref('reminderEnabled', v)} disabled={saving} />
              </div>

              {/* Reminder Time */}
              {prefs.reminderEnabled && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">{t('notifications.reminderTime')}</p>
                      <p className="text-xs text-zinc-500">{t('notifications.reminderTimeDesc')}</p>
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
                  <p className="text-sm font-semibold text-white">{t('notifications.weeklyEmail')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.weeklyEmailDesc')}</p>
                </div>
                <Toggle checked={prefs.weeklyEmailEnabled} onChange={(v) => updatePref('weeklyEmailEnabled', v)} disabled={saving} />
              </div>

              {/* Weekly letter — in-app */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-white">{t('notifications.sundayLetter')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.sundayLetterDesc')}</p>
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
                  <p className="text-sm font-semibold text-white">{t('notifications.letterEmailNotice')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.letterEmailNoticeDesc')}</p>
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
                  <p className="text-sm font-semibold text-white">{t('notifications.insights')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.insightsDesc')}</p>
                </div>
                <Toggle checked={prefs.notifyInsights} onChange={(v) => updatePref('notifyInsights', v)} disabled={saving} />
              </div>

              {/* Goals */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('notifications.goals')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.goalsDesc')}</p>
                </div>
                <Toggle checked={prefs.notifyGoals} onChange={(v) => updatePref('notifyGoals', v)} disabled={saving} />
              </div>

              {/* Updates */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('notifications.updates')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.updatesDesc')}</p>
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
              <h2 className="text-lg font-semibold text-white">{t('telegram.title')}</h2>
              <p className="text-xs text-zinc-500">{t('telegram.subtitle')}</p>
            </div>
          </div>

          {telegram === null ? (
            <div className="h-14 rounded-xl bg-zinc-800/50 animate-pulse" />
          ) : telegram.linked ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">{t('telegram.linkedTitle')}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t('telegram.linkedDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-white">{t('telegram.howToConnect')}</p>
                <ol className="space-y-2">
                  {[1, 2, 3, 4].map((n) => (
                    <li key={n} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {n}
                      </span>
                      {t(`telegram.step${n}`)}
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
                {t('telegram.openBot')}
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
              <h2 className="text-lg font-semibold text-white">{t('region.title')}</h2>
              <p className="text-xs text-zinc-500">{t('region.subtitle')}</p>
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
                <option key={tz.value} value={tz.value}>{t(`region.timezones.${tz.id}`)}</option>
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
            <h2 className="text-lg font-semibold text-white">{t('security.title')}</h2>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {!showPwForm ? (
              <button
                onClick={() => { setShowPwForm(true); setPwMsg(null); }}
                className={`${COMPONENTS.buttonSecondary} w-full`}
              >
                {t('security.changePassword')}
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 rounded-xl border border-zinc-700/50 p-4">
                <p className="text-sm font-semibold text-white">{t('security.changePasswordForm')}</p>
                {pwMsg && (
                  <div className={`rounded-lg px-3 py-2 text-sm ${pwMsg.type === 'success' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>
                    {pwMsg.text}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">{t('security.currentLabel')}</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} value={pwForm.current} required
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      placeholder={t('security.passwordPlaceholder')} className={`${COMPONENTS.inputField} pr-10 py-2 text-sm`}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">{t('security.newLabel')}</label>
                  <input
                    type={showPw ? 'text' : 'password'} value={pwForm.next} required minLength={8}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    placeholder={t('security.newPasswordPlaceholder')} className={`${COMPONENTS.inputField} py-2 text-sm`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">{t('security.confirmLabel')}</label>
                  <input
                    type={showPw ? 'text' : 'password'} value={pwForm.confirm} required
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    placeholder={t('security.passwordPlaceholder')} className={`${COMPONENTS.inputField} py-2 text-sm`}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={pwLoading}
                    className={`${COMPONENTS.buttonPrimary} flex-1 py-2 text-sm disabled:opacity-60`}>
                    {pwLoading ? t('security.saving') : t('security.save')}
                  </button>
                  <button type="button" onClick={() => { setShowPwForm(false); setPwMsg(null); }}
                    className={`${COMPONENTS.buttonSecondary} px-4 py-2 text-sm`}>
                    {t('security.cancel')}
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
            <h2 className="text-lg font-semibold text-white">{t('help.title')}</h2>
          </div>
          <button
            onClick={() => {
              resetAllTours();
              toast.success(t('help.tourReset'));
            }}
            className={`${COMPONENTS.buttonSecondary} w-full`}
          >
            {t('help.repeatTour')}
          </button>
        </div>

        {/* ── Privacidad: export de datos + borrado de cuenta ────────── */}
        <PrivacySettings />
      </div>
    </div>
  );
}
