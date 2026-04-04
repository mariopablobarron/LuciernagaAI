'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle2, ExternalLink, Globe, Lock, Eye, Send } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

type TelegramStatus = {
  linked: boolean;
  telegramId: string | null;
  botUsername: string;
};

export default function SettingsPage() {
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);

  useEffect(() => {
    fetch('/api/user/telegram-status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: TelegramStatus) => setTelegram(d))
      .catch(() => {});
  }, []);

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
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Cambiar contraseña
            </button>
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
