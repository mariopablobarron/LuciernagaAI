'use client';

import Link from 'next/link';
import { ArrowRight, Heart, Sparkles, Users, Globe, Shield, User } from 'lucide-react';

export default function SobreNosotrosPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">De donde surge esto</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Cada latido es una{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              eleccion
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Tres Mil Millones de Latidos nace de una conviccion: la tecnologia puede acompanar
            sin sustituir lo humano. No somos una app de productividad. Somos un espacio donde
            la inteligencia artificial se pone al servicio de lo que mas importa: que entiendas
            que te pasa y actues en consecuencia.
          </p>
        </div>
      </section>

      {/* Origin story */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">La pregunta que lo empezo todo</h2>
          </div>
          <div className="space-y-4 text-zinc-400 leading-relaxed">
            <p>
              El corazon humano late aproximadamente tres mil millones de veces en una vida.
              Cada uno de esos latidos es una oportunidad — de avanzar, de pararse, de elegir.
            </p>
            <p>
              La mayoria de las personas saben que algo tiene que cambiar. Lo sienten. Pero entre
              el saber y el hacer hay un abismo: bloqueos que no se nombran, patrones que se repiten,
              decisiones que se posponen. Y en ese espacio, la claridad se pierde.
            </p>
            <p>
              <strong className="text-white">Tres Mil Millones de Latidos</strong> existe para cerrar
              ese abismo. No con consejos genericos ni motivacion vacia, sino con una pregunta en el
              momento justo, un espejo que muestra lo que no estas viendo, y un siguiente paso que
              puedas dar hoy.
            </p>
          </div>
        </div>

        {/* Philosophy */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Como pensamos</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Interpelar antes de instruir',
                desc: 'No decimos que hacer. Preguntamos para que descubras lo que ya sabes pero no te atreves a ver.',
              },
              {
                title: 'Siempre el porque',
                desc: 'Cada accion tiene un motivo. Sin entender el porque, la accion es obediencia, no cambio.',
              },
              {
                title: 'Gafas nuevas',
                desc: 'Ayudamos a ver lo que has normalizado. Lo que das por hecho muchas veces es lo que mas te frena.',
              },
              {
                title: 'De lo local a lo global',
                desc: 'Empezamos por lo concreto de hoy — tu bloqueo, tu emocion — y desde ahi descubrimos el patron grande.',
              },
              {
                title: 'El cambio viene de dentro',
                desc: 'No se impone. Se interpela. La pregunta correcta genera mas cambio que la mejor instruccion.',
              },
              {
                title: 'Progreso, no perfeccion',
                desc: 'Un paso imperfecto hoy vale mas que un plan perfecto manana. Avanzar es lo que cuenta.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Startidea */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Quien esta detras</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <p className="text-lg font-bold text-white">Startidea</p>
                <p className="text-sm text-zinc-500">Agencia de Innovacion Social y Desarrollo Tecnologico</p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Tres Mil Millones de Latidos surge de{' '}
              <a href="https://startidea.es" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                Startidea
              </a>
              , una agencia con 15 años de experiencia trabajando con organizaciones que buscan
              impacto real. Hemos acompanado a empresas, instituciones educativas, ONGs y
              administraciones publicas en procesos de innovacion social y transformacion digital.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Despues de 15 años viendo como las personas se bloquean, posponen y pierden claridad
              — incluso cuando tienen recursos y motivacion — nos preguntamos: <strong className="text-white">¿y si la tecnologia
              pudiera hacer lo que un buen mentor hace? Estar ahi, en el momento justo, con la
              pregunta correcta.</strong>
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Tres Mil Millones de Latidos es nuestra respuesta. Un proyecto que combina inteligencia
              artificial, psicologia del comportamiento y 15 años de experiencia en acompanamiento
              real para crear algo que no existia: un mentor que no da respuestas — hace las preguntas
              que tu no te estas haciendo.
            </p>
          </div>
        </div>

        {/* Founder */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Fundador</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <p className="text-lg font-bold text-white">Mario Pablo Sanchez Barron</p>
                <p className="text-sm text-zinc-500">Fundador de Startidea · Creador de Tres Mil Millones de Latidos</p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Con mas de 15 años de trayectoria en el desarrollo de productos digitales con impacto
              social, Mario ha combinado la tecnologia con una vision profundamente humana: las
              herramientas digitales deben servir para que las personas se entiendan mejor a si
              mismas y actuen en consecuencia.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Tras años trabajando con equipos, clientes y organizaciones de todo tipo, identifico
              un patron recurrente: la mayoria de las personas no necesitan mas informacion ni mas
              consejos. Necesitan un espacio donde pensar con claridad, sin juicio, y un empujon
              concreto para actuar hoy — no manana.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              <strong className="text-white">Tres Mil Millones de Latidos es ese espacio.</strong> La
              respuesta a una pregunta que Mario se ha hecho durante años: ¿como ayudo a alguien a
              dar el primer paso cuando esta bloqueado, sin decirle lo que tiene que hacer?
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Compromisos</h2>
          </div>
          <div className="space-y-3">
            {[
              'No sustituimos ayuda profesional. Si detectamos riesgo, conectamos con lineas de emergencia.',
              'Tus conversaciones son tuyas. No vendemos datos ni los usamos con fines publicitarios.',
              'Puedes exportar o eliminar todos tus datos en cualquier momento.',
              'La IA acompana — no diagnostica, no prescribe, no juzga.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                <span className="mt-0.5 text-emerald-400 font-bold text-sm shrink-0">✓</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-zinc-500">
            <Heart className="inline w-4 h-4 text-cyan-500 mr-1" />
            Comprometidos con el bienestar emocional a traves de la tecnologia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              Empezar ahora <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://startidea.es"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Conocer Startidea <Globe className="w-4 h-4" />
            </a>
          </div>
          <p className="pt-6 text-sm text-zinc-500">
            ¿Profesional de la psicología, coaching o acompañamiento?{' '}
            <Link
              href="/para-profesionales"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Mira cómo complementa tu consulta
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
