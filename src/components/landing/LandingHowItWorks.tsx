export default function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Describe lo que evitas",
      description: "¿Qué llevas semanas/meses postergando? Escríbelo. No tiene que sonar bien.",
      icon: "✍️",
    },
    {
      number: "02",
      title: "Luciernaga entiende tu contexto",
      description: "Analiza tu bloqueo, emociones y patrones. Sin juzgar. Con calor.",
      icon: "🧠",
    },
    {
      number: "03",
      title: "Define tu siguiente paso",
      description: "Uno pequeño, concreto y alcanzable. No un plan maestro, solo el próximo.",
      icon: "🎯",
    },
    {
      number: "04",
      title: "Actúa y continúa",
      description: "Cada conversación suma. Tu contexto crece. La carga se hace más ligera.",
      icon: "⚡",
    },
  ];

  return (
    <section className="landing-how-it-works py-20 px-4 bg-muted/3">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            El proceso es simple
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cuatro pasos. Cinco minutos. Tu primer movimiento concreto.
          </p>
        </div>

        {/* Steps timeline */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6 md:gap-10">
              {/* Number */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-border bg-background">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <p className="text-muted-foreground max-w-xl">
                  {step.description}
                </p>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-32 w-0.5 h-20 bg-border hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
