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
  const emotionEmoji = getEmotionEmoji(state.emotionalState);
  const emotionLabel = getEmotionLabel(state.emotionalState);
  const completionPercentage = (state.completedActions / state.totalActions) * 100;

  return (
    <div className="relative w-32 h-32">
      {/* Outer rotating ring */}
      <div className="absolute inset-0 rounded-full border border-border/30 animate-spin" style={{ animationDuration: "20s" }} />

      {/* Middle ring */}
      <div className="absolute inset-2 rounded-full border border-border/20 animate-spin" style={{ animationDuration: "30s", animationDirection: "reverse" }} />

      {/* Main circle */}
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-card to-muted/50 border-2 border-border/50 shadow-lg flex flex-col items-center justify-center group cursor-default">
        {/* Content */}
        <div className="text-center space-y-2">
          <div className="text-3xl leading-none">{emotionEmoji}</div>
          <div className="text-xs font-semibold text-foreground capitalize">
            {emotionLabel}
          </div>
        </div>

        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-emotion-clarity transition-all duration-700 ${getEmotionColor(
              state.emotionalState
            )}`}
            strokeDasharray={`${completionPercentage * 3.016} 301.6`}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
      </div>

      {/* Stats below */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center space-y-1">
        <div className="text-xs font-semibold text-foreground">
          {state.completedActions}/{state.totalActions}
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(completionPercentage)}% completado
        </div>
      </div>
    </div>
  );
}

function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    blocked: "🚫",
    anxious: "⚡",
    doubt: "❓",
    clarity: "✨",
  };
  return emojiMap[emotion] || "❓";
}

function getEmotionLabel(emotion: string): string {
  const labelMap: Record<string, string> = {
    blocked: "Bloqueado",
    anxious: "Ansioso",
    doubt: "Duda",
    clarity: "Claridad",
  };
  return labelMap[emotion] || "Duda";
}

function getEmotionColor(emotion: string): string {
  const colorMap: Record<string, string> = {
    blocked: "text-emotion-blocked",
    anxious: "text-emotion-anxious",
    doubt: "text-emotion-doubt",
    clarity: "text-emotion-clarity",
  };
  return colorMap[emotion] || colorMap.doubt;
}
