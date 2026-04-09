'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function PrivacyPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Política de Privacidad</h1>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Tu privacidad es nuestra prioridad</h2>
            <p className="text-zinc-300 leading-relaxed">
              En Tres Mil Millones de Latidos tu privacidad importa. Esta política explica qué datos recopilamos,
              para qué los usamos y cómo los protegemos. Si tienes dudas, escríbenos a{' '}
              <a href="mailto:privacidad@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                privacidad@tresmilmillonesdelatidos.es
              </a>
              .
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Datos que recopilamos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Dirección de email (para identificar tu cuenta)</li>
              <li>✓ Mensajes y conversaciones dentro de Tres Mil Millones de Latidos</li>
              <li>✓ Patrones de uso anonimizados (frecuencia, no contenido)</li>
              <li>✗ No recopilamos datos de ubicación, pagos ni información sensible adicional</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Cómo usamos tus datos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Para ofrecerte el servicio de mentoría conversacional</li>
              <li>✓ Para personalizar tu experiencia y hacer seguimiento de tu progreso</li>
              <li>✓ Para enviarte comunicaciones relacionadas con tu cuenta</li>
              <li>✗ No vendemos ni compartimos tu información con terceros con fines comerciales</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Seguridad de tus datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Utilizamos cifrado estándar de la industria para proteger tu información tanto en
              tránsito como en reposo. El acceso a los datos está restringido al personal autorizado
              y a los sistemas necesarios para operar el servicio.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Tus derechos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Acceder a tus datos en cualquier momento</li>
              <li>✓ Solicitar la corrección de datos incorrectos</li>
              <li>✓ Pedir la eliminación completa de tu cuenta y datos</li>
              <li>✓ Optar por no recibir comunicaciones de marketing</li>
            </ul>
            <p className="text-zinc-400 text-sm">
              Para ejercer cualquiera de estos derechos, escribe{' '}
              <span className="font-mono text-zinc-300">/borrar_datos</span> en el chat de Telegram
              o contáctanos directamente.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Contacto</h2>
            <p className="text-zinc-300 leading-relaxed">
              Para cualquier pregunta sobre privacidad escríbenos a{' '}
              <a href="mailto:privacidad@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                privacidad@tresmilmillonesdelatidos.es
              </a>
              . Respondemos en menos de 48 horas.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
