'use client';

import Link from 'next/link';
import {
  Phone,
  MessageCircle,
  ShieldAlert,
  Heart,
  Ambulance,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

type Resource = {
  name: string;
  phone?: string;
  href?: string;
  hrefLabel?: string;
  desc: string;
  hours?: string;
  highlight?: boolean;
};

const URGENT: Resource[] = [
  {
    name: 'Emergencias',
    phone: '112',
    desc: 'Emergencia inmediata. Riesgo vital, propio o ajeno.',
    hours: '24 h · gratuito',
    highlight: true,
  },
  {
    name: '024 — Línea de atención a la conducta suicida',
    phone: '024',
    desc: 'Línea oficial del Ministerio de Sanidad. Si tienes pensamientos de suicidio o acompañas a alguien que los tiene.',
    hours: '24 h · gratuito · confidencial',
    highlight: true,
  },
  {
    name: 'Teléfono de la Esperanza',
    phone: '717 003 717',
    href: 'https://telefonodelaesperanza.org',
    hrefLabel: 'telefonodelaesperanza.org',
    desc: 'Atención emocional y apoyo en crisis por profesionales y voluntariado formado.',
    hours: '24 h',
  },
];

const SUPPORT: Resource[] = [
  {
    name: 'ANAR — Ayuda a niños y adolescentes',
    phone: '900 20 20 10',
    href: 'https://www.anar.org',
    hrefLabel: 'anar.org',
    desc: 'Si tienes menos de 18 años o quieres ayudar a un menor en situación de riesgo.',
    hours: '24 h · gratuito · anónimo',
  },
  {
    name: '016 — Violencia de género y sexual',
    phone: '016',
    href: 'https://violenciagenero.igualdad.gob.es',
    hrefLabel: 'violenciagenero.igualdad.gob.es',
    desc: 'Atención a víctimas de violencia contra la mujer y violencia sexual. No deja rastro en la factura.',
    hours: '24 h · gratuito',
  },
  {
    name: 'Confederación SALUD MENTAL ESPAÑA',
    href: 'https://consaludmental.org',
    hrefLabel: 'consaludmental.org',
    desc: 'Red de asociaciones en toda España. Información, grupos de apoyo y derivación a recursos locales.',
  },
];

export default function CrisisPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        {/* Cabecera */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Ayuda urgente</h1>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            Si estás en crisis, pensando en hacerte daño o acompañando a alguien que lo está, estas
            son las líneas a las que llamar <strong className="text-white">ahora</strong>.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            El mentor de esta app no sustituye a un profesional humano. En situaciones graves,
            llama. Te escuchan personas formadas y la llamada es confidencial.
          </p>
        </div>

        {/* Recursos urgentes */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ambulance className="w-5 h-5 text-rose-400" />
            Líneas de emergencia (España)
          </h2>
          <div className="space-y-3">
            {URGENT.map((r) => (
              <ResourceCard key={r.name} r={r} />
            ))}
          </div>
        </div>

        {/* Recursos de apoyo */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-cyan-400" />
            Otros recursos de apoyo
          </h2>
          <div className="space-y-3">
            {SUPPORT.map((r) => (
              <ResourceCard key={r.name} r={r} />
            ))}
          </div>
        </div>

        {/* Qué hacer mientras tanto */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Mientras esperas a que te atiendan</h2>
          <ul className="space-y-3 text-sm text-zinc-400 leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-cyan-400 font-bold shrink-0">1.</span>
              <span>
                <strong className="text-white">No te quedes solo/a.</strong> Avisa a alguien de
                confianza, aunque sea por mensaje. Si no tienes a nadie cerca, llama igualmente al
                024 — escuchar otra voz ayuda.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-cyan-400 font-bold shrink-0">2.</span>
              <span>
                <strong className="text-white">Aleja lo que pueda hacerte daño.</strong> Pon
                distancia física con medicación, objetos cortantes, armas. Dáselos a alguien o
                guárdalos fuera de tu alcance.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-cyan-400 font-bold shrink-0">3.</span>
              <span>
                <strong className="text-white">Respira despacio.</strong> Inspira 4 segundos,
                retén 4, exhala 6. Repite 5 veces. No arregla nada, pero baja el pico.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-cyan-400 font-bold shrink-0">4.</span>
              <span>
                <strong className="text-white">Este momento va a pasar.</strong> La crisis no es
                el resto de tu vida. Aguanta hasta que alguien formado te acompañe.
              </span>
            </li>
          </ul>
        </div>

        {/* Nota legal */}
        <p className="text-xs text-zinc-600 text-center leading-relaxed">
          Esta página lista recursos públicos de emergencia en España. La información se revisa
          periódicamente, pero si detectas que algún número ha cambiado, escríbenos desde{' '}
          <Link href="/contact" className="text-zinc-500 hover:text-zinc-300 underline">
            contacto
          </Link>
          . Tres Mil Millones de Latidos no sustituye atención profesional ni servicios de
          urgencias.
        </p>
      </div>
    </div>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  const border = r.highlight ? 'border-rose-500/40' : 'border-zinc-800';
  const bg = r.highlight ? 'bg-rose-500/5' : 'bg-zinc-900/50';

  return (
    <div className={`rounded-xl border ${border} ${bg} p-5 space-y-3`}>
      <div className="space-y-1">
        <p className="text-white font-semibold">{r.name}</p>
        <p className="text-sm text-zinc-400 leading-relaxed">{r.desc}</p>
        {r.hours && (
          <p className="text-xs text-zinc-500">{r.hours}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {r.phone && (
          <a
            href={`tel:${r.phone.replace(/\s/g, '')}`}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
              r.highlight
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/25'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            <Phone className="w-4 h-4" />
            {r.phone}
          </a>
        )}
        {r.href && (
          <a
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-all text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            {r.hrefLabel ?? 'Web'}
          </a>
        )}
      </div>
    </div>
  );
}
