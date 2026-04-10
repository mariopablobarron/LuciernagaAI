'use client';

import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function PrivacyPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>Politica de Privacidad</h1>
        <p className="text-sm text-zinc-500">Ultima actualizacion: 10 de abril de 2026</p>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>

          {/* 1 — Responsable */}
          <section className="space-y-4">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>1. Responsable del tratamiento</h2>
            <div className="text-zinc-300 leading-relaxed space-y-1">
              <p><strong className="text-white">Titular:</strong> Mario Pablo Sanchez Barron</p>
              <p><strong className="text-white">Nombre comercial:</strong> Startidea</p>
              <p><strong className="text-white">Producto:</strong> Tres Mil Millones de Latidos</p>
              <p><strong className="text-white">Correo de privacidad:</strong>{' '}
                <a href="mailto:privacidad@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                  privacidad@tresmilmillonesdelatidos.es
                </a>
              </p>
              <p><strong className="text-white">Web:</strong>{' '}
                <a href="https://tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                  tresmilmillonesdelatidos.es
                </a>
              </p>
            </div>
          </section>

          {/* 2 — Datos recopilados */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>2. Datos que recopilamos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>Dirección de email (para identificar tu cuenta)</li>
              <li>Nombre (si lo proporcionas voluntariamente)</li>
              <li>Contraseña (almacenada con hash, nunca en texto plano)</li>
              <li>Mensajes y conversaciones dentro de la plataforma</li>
              <li>Check-ins emocionales y entradas de diario</li>
              <li>Metas, acciones y progreso</li>
              <li>Patrones de uso anonimizados (frecuencia de acceso, no contenido)</li>
              <li>ID de Telegram (si vinculas tu cuenta)</li>
              <li>Datos de suscripcion gestionados por Stripe (no almacenamos datos de pago)</li>
            </ul>
            <p className="text-sm text-zinc-400">
              No recopilamos datos de ubicacion, datos biometricos ni informacion sensible mas alla de lo que tu decides compartir en las conversaciones.
            </p>
          </section>

          {/* 3 — Base juridica */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>3. Base juridica del tratamiento</h2>
            <ul className="space-y-2 text-zinc-300">
              <li><strong className="text-white">Ejecucion del contrato</strong> (art. 6.1.b RGPD): Necesitamos tus datos para prestarte el servicio que has solicitado.</li>
              <li><strong className="text-white">Consentimiento</strong> (art. 6.1.a RGPD): Para comunicaciones de marketing y funcionalidades opcionales como el portal familiar.</li>
              <li><strong className="text-white">Interes legitimo</strong> (art. 6.1.f RGPD): Para mejorar el servicio mediante analisis anonimizados y para la deteccion de situaciones de crisis.</li>
            </ul>
          </section>

          {/* 4 — Finalidad */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>4. Como usamos tus datos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li>Para ofrecerte el servicio de mentoria conversacional con IA</li>
              <li>Para personalizar tu experiencia y hacer seguimiento de tu progreso</li>
              <li>Para detectar situaciones de riesgo emocional y activar protocolos de crisis</li>
              <li>Para enviarte comunicaciones relacionadas con tu cuenta (recordatorios, resumenes semanales)</li>
              <li>Para generar estadisticas anonimizadas que mejoren el servicio</li>
            </ul>
            <p className="text-sm text-zinc-400">
              No vendemos, cedemos ni compartimos tu informacion con terceros con fines comerciales o publicitarios.
            </p>
          </section>

          {/* 5 — Terceros */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>5. Proveedores y terceros</h2>
            <p className="text-zinc-300 leading-relaxed">
              Para operar el servicio utilizamos los siguientes proveedores:
            </p>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li><strong className="text-white">Alojamiento:</strong> Servidores europeos con cifrado en transito y en reposo.</li>
              <li><strong className="text-white">IA conversacional:</strong> Las conversaciones se procesan mediante modelos de lenguaje. No se utilizan para entrenar modelos de terceros.</li>
              <li><strong className="text-white">Stripe:</strong> Gestion de pagos. Stripe cumple PCI-DSS. No almacenamos datos de tarjeta.</li>
              <li><strong className="text-white">Telegram:</strong> Si vinculas tu cuenta. Telegram procesa los mensajes que le envias.</li>
              <li><strong className="text-white">Email transaccional:</strong> Para envio de verificacion, recordatorios y resumenes.</li>
            </ul>
            <p className="text-zinc-400 text-sm">
              Todos los proveedores estan obligados contractualmente a proteger tus datos conforme al RGPD.
            </p>
          </section>

          {/* 6 — Transferencias internacionales */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>6. Transferencias internacionales</h2>
            <p className="text-zinc-300 leading-relaxed">
              Algunos de nuestros proveedores pueden procesar datos fuera del Espacio Economico Europeo (EEE).
              En todos los casos, existen garantias adecuadas: decisiones de adecuacion de la Comision Europea,
              clausulas contractuales tipo o marcos de privacidad equivalentes (EU-US Data Privacy Framework).
            </p>
          </section>

          {/* 7 — Retencion */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>7. Conservacion de datos</h2>
            <ul className="space-y-2 text-zinc-300">
              <li><strong className="text-white">Cuenta activa:</strong> Mientras mantengas tu cuenta, conservamos tus datos para prestarte el servicio.</li>
              <li><strong className="text-white">Tras la eliminacion:</strong> Al eliminar tu cuenta, borramos tus datos personales en un plazo maximo de 30 dias.</li>
              <li><strong className="text-white">Datos anonimizados:</strong> Las estadisticas agregadas y anonimizadas pueden conservarse indefinidamente.</li>
              <li><strong className="text-white">Obligaciones legales:</strong> Si la ley nos obliga a conservar ciertos datos, lo haremos por el periodo requerido.</li>
            </ul>
          </section>

          {/* 8 — Cookies */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>8. Cookies</h2>
            <p className="text-zinc-300 leading-relaxed">
              Utilizamos cookies estrictamente necesarias para el funcionamiento del servicio:
            </p>
            <ul className="space-y-2 text-zinc-300 text-sm">
              <li><strong className="text-white">mw_session:</strong> Cookie de sesion de usuario. Necesaria para mantener tu sesion iniciada. Caduca al cerrar sesion.</li>
              <li><strong className="text-white">mw_admin_session:</strong> Cookie de sesion de administracion. Solo para el equipo interno. Caduca en 24 horas.</li>
              <li><strong className="text-white">Preferencias de accesibilidad:</strong> Almacenadas en localStorage para recordar tus ajustes visuales.</li>
            </ul>
            <p className="text-zinc-400 text-sm">
              No utilizamos cookies de terceros, cookies de seguimiento ni cookies publicitarias.
              Al ser cookies estrictamente necesarias, no requieren consentimiento previo segun la directiva ePrivacy.
            </p>
          </section>

          {/* 9 — Derechos */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>9. Tus derechos</h2>
            <p className="text-zinc-300 leading-relaxed">
              Conforme al RGPD, tienes los siguientes derechos:
            </p>
            <ul className="space-y-2 text-zinc-300">
              <li><strong className="text-white">Acceso:</strong> Solicitar una copia de todos tus datos personales.</li>
              <li><strong className="text-white">Rectificacion:</strong> Corregir datos inexactos o incompletos.</li>
              <li><strong className="text-white">Supresion:</strong> Pedir la eliminacion de tus datos («derecho al olvido»).</li>
              <li><strong className="text-white">Portabilidad:</strong> Recibir tus datos en un formato estructurado y legible (JSON o CSV).</li>
              <li><strong className="text-white">Oposicion:</strong> Oponerte al tratamiento basado en interes legitimo.</li>
              <li><strong className="text-white">Limitacion:</strong> Solicitar la restriccion del tratamiento en determinados supuestos.</li>
            </ul>
            <p className="text-zinc-400 text-sm">
              Para ejercer estos derechos: desde la plataforma, ve a Ajustes y usa la opcion de exportar o eliminar datos.
              Desde Telegram, escribe <span className="font-mono text-zinc-300">/borrar_datos</span>.
              O contactanos en{' '}
              <a href="mailto:privacidad@tresmilmillonesdelatidos.es" className="text-cyan-400 hover:underline">
                privacidad@tresmilmillonesdelatidos.es
              </a>.
              Respondemos en un plazo maximo de 30 dias.
            </p>
            <p className="text-zinc-400 text-sm">
              Tienes derecho a presentar una reclamacion ante la{' '}
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                Agencia Espanola de Proteccion de Datos (AEPD)
              </a>.
            </p>
          </section>

          {/* 10 — Menores */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>10. Menores de edad</h2>
            <p className="text-zinc-300 leading-relaxed">
              El servicio esta dirigido a mayores de 16 anos. No recopilamos datos de menores de forma deliberada.
              Si eres menor de 16 anos y has creado una cuenta, contactanos para eliminarla.
            </p>
          </section>

          {/* 11 — Cambios */}
          <section className="space-y-4 border-t border-zinc-800 pt-6">
            <h2 className={`${TYPOGRAPHY.h2} text-white`}>11. Cambios en esta politica</h2>
            <p className="text-zinc-300 leading-relaxed">
              Podemos actualizar esta politica periodicamente. Si los cambios son significativos, te lo notificaremos
              por email o mediante un aviso en la plataforma con al menos 30 dias de antelacion.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
