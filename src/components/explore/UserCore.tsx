"use client";

type UserState = {
  emotionalState: "blocked" | "anxious" | "doubt" | "clarity";
  completedActions: number;
  totalActions: number;
};

type UserCoreProps = {
  state: UserState;
};

export default function UserCore({ state }: UserCoreProps) {
  const completionPercentage = (state.completedActions / state.totalActions) * 100;

  return (
    <div className="relative w-56 h-56">
      {/* Outer rotating ring */}
      <div className="absolute inset-0 rounded-full border border-border/40 animate-spin" style={{ animationDuration: "25s" }} />

      {/* Middle ring */}
      <div className="absolute inset-3 rounded-full border border-border/30 animate-spin" style={{ animationDuration: "35s", animationDirection: "reverse" }} />

      {/* Main circle */}
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-card via-card to-muted/40 border-2 border-border/60 shadow-xl flex flex-col items-center justify-center group cursor-default">
        {/* Content */}
        <div className="text-center space-y-3 px-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              ¿Qué estás evitando ahora mismo?
            </h2>
            <p className="text-xs text-muted-foreground">
              No le des más vueltas. Escríbelo.
            </p>
          </div>

          {/* Progress section */}
          <div className="space-y-2 pt-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden mx-auto border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-emotion-doubt to-emotion-clarity transition-all duration-700 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-xs font-medium text-foreground">
              {state.completedActions}/{state.totalActions} acciones
            </div>
          </div>
        </div>

        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full border border-foreground/5 animate-pulse" />

        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border/20"
          />
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`text-emotion-clarity transition-all duration-700`}
            strokeDasharray={`${completionPercentage * 3.016} 301.6`}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
      </div>
    </div>
  );
}
