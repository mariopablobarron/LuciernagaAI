import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="landing-footer py-12 px-4 bg-muted/50 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-foreground">Luciernaga AI</h3>
            <p className="text-sm text-muted-foreground">
              Mentoría conversacional con foco en acción, continuidad emocional y contexto persistente.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Enlaces</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="text-muted-foreground hover:text-foreground transition-colors">
                  Empieza aquí
                </Link>
              </li>
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <a href="/api/legal" className="text-muted-foreground hover:text-foreground transition-colors">
                  Límites del sistema
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Responsable</h4>
            <p className="text-sm text-muted-foreground">
              Hecho con claridad y sin rodeos.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Luciernaga AI. Todos los derechos reservados.</p>
          <p>Mentoría para los que prefieren la acción a la perfección.</p>
        </div>
      </div>
    </footer>
  );
}
