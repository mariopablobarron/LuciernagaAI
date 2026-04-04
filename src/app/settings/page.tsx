'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle2, ExternalLink, Globe, Lock, Eye, EyeOff, Send } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

type TelegramStatus = {
  linked: boolean;
  telegramId: string | null;
  botUsername: string;
};

type PasswordForm = { current: string; next: string; confirm: string };

export default function SettingsPage() {
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/user/telegram-status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: TelegramStatus) => setTelegram(d))
      .catch(() => {});
  }, []);

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

  const botUrl = telegram?.botUsername
    ? `https://t.me/${telegram.botUsername}`
    : 'https://t.me/';

  return (
    <div className={`bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Configuración</h1>
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

          {/* Status */}
          {telegram === null ? (
            <div className="h-14 rounded-xl bg-zinc-800/50 animate-pulse" />
          ) : telegram.linked ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Cuenta conectada</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Ya recibes mensajes y recordatorios en Telegram.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Cómo conectar</p>
                <ol className="space-y-2">
                  {[
                    { step: '1', text: 'Abre el bot de Luciérnaga en Telegram' },
                    { step: '2', text: 'Pulsa Iniciar o escribe /start' },
                    { step: '3', text: 'Envía el comando /vincular' },
                    { step: '4', text: 'Haz clic en el enlace que te mande el bot' },
                  ].map((item) => (
                    <li key={item.step} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {item.step}
                      </span>
                      {item.text}
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

              {telegram.botUsername && (
                <p className="text-center text-xs text-zinc-600">
                  @{telegram.botUsername}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Notifications ──────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            {[
              { label: 'Recordatorios de check-in', desc: 'Notificaciones diarias para check-ins' },
              { label: 'Nuevos insights', desc: 'Cuando tengas nuevas recomendaciones' },
              { label: 'Objetivos completados', desc: 'Celebraciones cuando termines un objetivo' },
              { label: 'Actualizaciones importantes', desc: 'Cambios y nuevas funciones' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Privacy ────────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Privacidad</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            {[
              { label: 'Perfil visible', desc: 'Otros usuarios pueden ver tu perfil público' },
              { label: 'Compartir estadísticas', desc: 'Permitir que se usen tus datos anónimos para mejorar el producto' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Security ───────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Seguridad</h2>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">

            {/* Change password */}
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
                  <label className="text-xs font-semibold text-zinc-400">Confirmar nueva contraseña</label>
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

            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Activar autenticación de dos factores
            </button>
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Ver sesiones activas
            </button>
          </div>
        </div>

        {/* ── Preferences ────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Preferencias</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div>
              <p className="font-semibold text-white mb-3">Idioma</p>
              <select className={`${COMPONENTS.inputField} w-full`}>
                <option>Español</option>
                <option>English</option>
                <option>Português</option>
              </select>
            </div>
            <div>
              <p className="font-semibold text-white mb-3">Zona horaria</p>
              <select className={`${COMPONENTS.inputField} w-full`}>
                <option>America/Argentina/Buenos_Aires</option>
                <option>America/Mexico_City</option>
                <option>Europe/Madrid</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Danger zone ────────────────────────────────────────────── */}
        <div className={`${COMPONENTS.card} p-6 space-y-3 border-l-4 border-l-red-500`}>
          <h2 className="text-lg font-semibold text-red-400">Zona de peligro</h2>
          <p className="text-sm text-zinc-400">Estas acciones no se pueden deshacer.</p>
          <button className="w-full py-2 px-4 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
            Eliminar mi cuenta y todos mis datos
          </button>
        </div>
      </div>
    </div>
  );
}
