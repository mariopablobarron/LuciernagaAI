export default function LandingFeatures() {
  const features = [
    {
      icon: "📝",
      title: "Escríbelo sin filtro",
      description: "Nombra eso que evitas sin juicio. La honestidad es el primer paso.",
    },
    {
      icon: "🎯",
      title: "Define tu siguiente paso",
      description: "Un paso pequeño, concreto y alcanzable. No planes a largo plazo.",
    },
    {
      icon: "⚡",
      title: "Actúa hoy mismo",
      description: "Termina con la indecisión. Tu próximo movimiento está claro ahora.",
    },
    {
      icon: "💭",
      title: "Persistencia sin presión",
      description: "Continuidad emocional. Cada sesión suma. Sin culpa si tomas un descanso.",
    },
    {
      icon: "🔄",
      title: "Contexto que permanece",
      description: "Tu IA mentor recuerda dónde estabas. Continuidad en la conversación.",
    },
    {
      icon: "✨",
      title: "Transformación visible",
      description: "De bloqueado a claro. Mira cómo cambias semana a semana.",
    },
  ];

  return (
    <section className="landing-features py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Cómo Luciernaga te ayuda
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No es un coach que grita "sí puedes". Es tu contexto persistente que te ayuda a encontrar tu próximo paso cuando estás bloqueado.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card p-6 rounded-xl border border-border bg-card hover:border-muted-foreground/50 transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
