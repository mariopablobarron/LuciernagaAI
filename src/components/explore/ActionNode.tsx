"use client";

type ActionNodeType = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
};

type ActionNodeProps = {
  action: ActionNodeType;
  isActive: boolean;
  onClick: () => void;
};

export default function ActionNode({ action, isActive, onClick }: ActionNodeProps) {
  const colorClass = getNodeColorClass(action.color);
  const glowColor = getGlowColor(action.color);

  return (
    <button
      onClick={onClick}
      className={`action-node group relative h-24 w-24 transition-all duration-300 ${
        isActive ? "scale-110" : "scale-100 hover:scale-105"
      } ${action.completed ? "opacity-30 pointer-events-none" : ""}`}
      aria-label={`${action.title}: ${action.description}`}
      aria-pressed={isActive}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-full opacity-0 blur-xl transition-opacity duration-300 ${
          isActive ? "opacity-100" : "group-hover:opacity-50"
        } ${glowColor}`}
      />

      {/* Node circle */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${
          isActive ? `border-foreground ${colorClass}` : `border-border/40 ${colorClass}`
        }`}
      >
        {/* Icon */}
        <div className="text-2xl mb-1">{action.icon}</div>

        {/* Pulse animation when active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 border-foreground animate-pulse" />
        )}
      </div>

      {/* Tooltip on hover/active */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 -top-16 pointer-events-none transition-all duration-300 ${
          isActive ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        }`}
      >
        <div className="bg-foreground text-background rounded-lg px-3 py-2 text-center whitespace-nowrap">
          <p className="text-xs font-semibold">{action.title}</p>
          <p className="text-xs opacity-90 mt-0.5">{action.description}</p>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-foreground transform rotate-45" />
      </div>

      {/* Completed checkmark overlay */}
      {action.completed && (
        <div className="absolute inset-0 flex items-center justify-center text-lg">✓</div>
      )}
    </button>
  );
}

function getNodeColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blocked: "bg-emotion-blocked/20",
    anxious: "bg-emotion-anxious/20",
    doubt: "bg-emotion-doubt/20",
    clarity: "bg-emotion-clarity/20",
  };
  return colorMap[color] || colorMap.doubt;
}

function getGlowColor(color: string): string {
  const glowMap: Record<string, string> = {
    blocked: "bg-emotion-blocked",
    anxious: "bg-emotion-anxious",
    doubt: "bg-emotion-doubt",
    clarity: "bg-emotion-clarity",
  };
  return glowMap[color] || glowMap.doubt;
}
