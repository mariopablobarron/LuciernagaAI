'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function TermsPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Términos de Servicio</h1>

        <div className={`${COMPONENTS.card} p-8 space-y-6 prose prose-invert max-w-none`}>
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>1. Aceptación de términos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Al acceder y usar Luciernaga, aceptas estos términos de servicio. Si no estás de acuerdo, 
              por favor no uses la plataforma.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>2. Limitación de responsabilidad</h2>
            <p className="text-zinc-300 leading-relaxed">
              Luciernaga es una herramienta de mentoría de IA. No sustituye terapia profesional ni 
              diagnóstico médico. En caso de crisis o emergencia, contacta con servicios de emergencia 
              o un profesional de salud mental.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>3. Uso aceptable</h2>
            <p className="text-zinc-300 leading-relaxed">
              Te comprometes a usar Luciernaga únicamente para propósitos legales y benéficos. 
              No utilizarás la plataforma para acosar, amenazar o dañar a otros.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>4. Privacidad y datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tu privacidad es sagrada. Consulta nuestra Política de Privacidad para entender cómo 
              manejamos tus datos. No vendemos información a terceros.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>5. Cambios a los términos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Nos reservamos el derecho de modificar estos términos. Los cambios entrarán en vigor 
              30 días después de la notificación.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
