'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function PrivacyPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Política de Privacidad</h1>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Tu privacidad es sagrada</h2>
            <p className="text-zinc-300 leading-relaxed">
              En Luciernaga, tu privacidad es nuestra prioridad máxima. Esta política explica cómo 
              recopilamos, usamos y protegemos tu información personal.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Qué datos recopilamos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Información de cuenta (email, nombre)</li>
              <li>✓ Conversaciones y mensajes dentro de Luciernaga</li>
              <li>✓ Datos de uso (patrones de acceso, no contenido)</li>
              <li>✓ No recopilamos datos de ubicación ni información sensible adicional</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Cómo usamos tus datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Usamos tus datos para:
            </p>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Proporcionar el servicio de Luciernaga</li>
              <li>✓ Mejorar y personalizar tu experiencia</li>
              <li>✓ Comunicaciones de seguridad</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Seguridad de datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Usamos encriptación de grado militar (AES-256) para proteger tus datos. 
              Tu información está almacenada de forma segura y solo es accesible para sistemas autorizados.
            </p>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Tus derechos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tienes derecho a:
            </p>
            <ul className="space-y-2 text-zinc-300">
              <li>✓ Acceder a tus datos en cualquier momento</li>
              <li>✓ Descargar una copia de tus datos</li>
              <li>✓ Solicitar la eliminación de tus datos</li>
              <li>✓ Optar por no compartir datos anónimos</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>Contacto</h2>
            <p className="text-zinc-300 leading-relaxed">
              Si tienes preguntas sobre privacidad, contáctanos en privacy@luciernaga.ai
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
