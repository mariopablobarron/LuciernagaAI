'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function TermsPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Términos de Servicio</h1>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>1. Aceptación de términos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Al acceder y usar Tres Mil Millones de Latidos aceptas estos términos de servicio. Si no estás de
              acuerdo con alguno de ellos, por favor no uses la plataforma.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>2. Limitación de responsabilidad</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tres Mil Millones de Latidos es una herramienta de acompañamiento conversacional con inteligencia
              artificial. No sustituye la terapia psicológica, el diagnóstico médico ni la
              intervención profesional de salud mental. En situaciones de crisis o emergencia,
              contacta de inmediato con los servicios de emergencia de tu país o un profesional
              de salud mental.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>3. Uso aceptable</h2>
            <p className="text-zinc-300 leading-relaxed">
              Te comprometes a usar Tres Mil Millones de Latidos únicamente para propósitos lícitos y en beneficio
              de tu desarrollo personal. Queda prohibido usar la plataforma para acosar, amenazar,
              difamar o perjudicar a terceros.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>4. Privacidad y datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tu privacidad es nuestra prioridad. Consulta nuestra{' '}
              <a href="/privacy" className="text-cyan-400 hover:underline">
                Política de Privacidad
              </a>{' '}
              para entender en detalle cómo recopilamos, usamos y protegemos tus datos. No
              vendemos ni cedemos tu información a terceros con fines comerciales.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>5. Modificaciones</h2>
            <p className="text-zinc-300 leading-relaxed">
              Nos reservamos el derecho de actualizar estos términos. Cualquier cambio relevante
              será comunicado con al menos 30 días de antelación antes de entrar en vigor.
              El uso continuado del servicio implica la aceptación de los términos vigentes.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>6. Contacto</h2>
            <p className="text-zinc-300 leading-relaxed">
              Para consultas sobre estos términos escríbenos a{' '}
              <a href="mailto:hola@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                hola@tresmilmillonesdelatidos.es
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
