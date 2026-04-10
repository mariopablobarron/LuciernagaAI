'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function TermsPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Terminos de Servicio</h1>
        <p className="text-sm text-zinc-500">Ultima actualizacion: 10 de abril de 2026</p>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>

          {/* 1 */}
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>1. Aceptacion de terminos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Al acceder y usar Tres Mil Millones de Latidos aceptas estos terminos de servicio. Si no estas de
              acuerdo con alguno de ellos, por favor no uses la plataforma.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>2. Descripcion del servicio</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tres Mil Millones de Latidos es una plataforma de acompanamiento personal basada en inteligencia
              artificial. El servicio incluye conversaciones con un mentor IA, check-ins emocionales, diario
              personal, metas con acciones, ejercicios guiados y programas de transformacion.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>3. Aviso legal — No es terapia</h2>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-amber-400">Tres Mil Millones de Latidos NO sustituye la terapia psicologica,
              el diagnostico medico ni la intervencion profesional de salud mental.</strong>
            </p>
            <p className="text-zinc-300 leading-relaxed">
              La IA acompana, hace preguntas y propone acciones, pero no diagnostica, no prescribe y no puede
              proporcionar atencion clinica. En situaciones de crisis o emergencia, contacta de inmediato con:
            </p>
            <ul className="space-y-1 text-zinc-300">
              <li><strong className="text-white">024</strong> — Linea de atencion a la conducta suicida (Espana, 24/7)</li>
              <li><strong className="text-white">112</strong> — Emergencias (Espana / UE)</li>
              <li><strong className="text-white">988</strong> — Suicide & Crisis Lifeline (Estados Unidos, 24/7)</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>4. Limitacion de responsabilidad</h2>
            <p className="text-zinc-300 leading-relaxed">
              El servicio se proporciona «tal cual» (as is). No garantizamos que las respuestas de la IA sean
              siempre precisas, completas o adecuadas a tu situacion particular. Debes aplicar tu propio criterio
              antes de actuar sobre cualquier sugerencia.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              En la medida maxima permitida por la ley, Startidea no sera responsable de danos indirectos,
              incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del servicio.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>5. Disponibilidad del servicio</h2>
            <p className="text-zinc-300 leading-relaxed">
              Nos esforzamos por mantener el servicio disponible 24/7, pero no garantizamos su disponibilidad
              ininterrumpida. Puede haber periodos de mantenimiento, actualizaciones o incidencias tecnicas
              que afecten temporalmente al acceso.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>6. Uso aceptable</h2>
            <p className="text-zinc-300 leading-relaxed">
              Te comprometes a usar la plataforma unicamente para propositos licitos y en beneficio
              de tu desarrollo personal. Queda prohibido:
            </p>
            <ul className="space-y-1 text-zinc-300">
              <li>Acosar, amenazar, difamar o perjudicar a terceros</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Usar el servicio para generar contenido ilegal o danino</li>
              <li>Manipular o intentar eludir los sistemas de seguridad</li>
            </ul>
          </section>

          {/* 7 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>7. Propiedad intelectual</h2>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-white">Tu contenido es tuyo.</strong> Las conversaciones, entradas de diario,
              metas y reflexiones que generas son de tu propiedad. Puedes exportarlas o eliminarlas en cualquier momento.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Al usar el servicio, nos otorgas una licencia limitada, no exclusiva y revocable para procesar
              tu contenido con el unico fin de prestarte el servicio (generar respuestas de la IA, detectar
              estados emocionales, generar insights). No usamos tu contenido para entrenar modelos de IA
              de terceros ni para fines publicitarios.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              La marca, el diseno, el codigo y los contenidos originales de Tres Mil Millones de Latidos
              son propiedad de Startidea. No se permite su reproduccion sin autorizacion.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>8. Planes, pagos y cancelacion</h2>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-white">Periodo MVP (hasta octubre 2026):</strong> Todas las funciones
              estan disponibles de forma gratuita. No se requiere tarjeta de credito.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-white">Planes de pago (post-MVP):</strong> Los pagos se gestionan a traves
              de Stripe. Las suscripciones se renuevan automaticamente salvo que las canceles antes de la fecha
              de renovacion.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-white">Cancelacion:</strong> Puedes cancelar tu suscripcion en cualquier
              momento desde Ajustes o desde el portal de pagos de Stripe. Seguiras teniendo acceso al plan Pro
              hasta el final del periodo ya pagado. No se realizan reembolsos parciales por periodos no utilizados.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              <strong className="text-white">Eliminacion de cuenta:</strong> Puedes eliminar tu cuenta y todos
              tus datos en cualquier momento desde Ajustes o escribiendo <span className="font-mono text-zinc-300">/borrar_datos</span> en Telegram.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>9. Privacidad y datos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Tu privacidad es nuestra prioridad. Consulta nuestra{' '}
              <a href="/privacy" className="text-cyan-400 hover:underline">
                Politica de Privacidad
              </a>{' '}
              para entender en detalle como recopilamos, usamos y protegemos tus datos.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>10. Modificaciones</h2>
            <p className="text-zinc-300 leading-relaxed">
              Nos reservamos el derecho de actualizar estos terminos. Cualquier cambio relevante
              sera comunicado con al menos 30 dias de antelacion por email o aviso en la plataforma.
              El uso continuado del servicio tras ese periodo implica la aceptacion de los terminos vigentes.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>11. Legislacion aplicable</h2>
            <p className="text-zinc-300 leading-relaxed">
              Estos terminos se rigen por la legislacion espanola. Para cualquier controversia, las partes
              se someten a los juzgados y tribunales de Granada (Espana), salvo que la normativa de consumo
              establezca un fuero diferente.
            </p>
          </section>

          {/* 12 — LSSI */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>12. Aviso legal (LSSI)</h2>
            <p className="text-zinc-300 leading-relaxed">
              En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Informacion
              y de Comercio Electronico (LSSI-CE):
            </p>
            <div className="text-zinc-300 leading-relaxed space-y-1 text-sm">
              <p><strong className="text-white">Titular:</strong> Mario Pablo Sanchez Barron</p>
              <p><strong className="text-white">Nombre comercial:</strong> Startidea</p>
              <p><strong className="text-white">Domicilio:</strong> Granada, Espana</p>
              <p><strong className="text-white">Correo electronico:</strong>{' '}
                <a href="mailto:hola@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                  hola@tresmilmillonesdelatidos.es
                </a>
              </p>
              <p><strong className="text-white">Sitio web:</strong>{' '}
                <a href="https://tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                  tresmilmillonesdelatidos.es
                </a>
              </p>
            </div>
          </section>

          {/* 13 */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>13. Contacto</h2>
            <p className="text-zinc-300 leading-relaxed">
              Para consultas sobre estos terminos escribenos a{' '}
              <a href="mailto:hola@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                hola@tresmilmillonesdelatidos.es
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
