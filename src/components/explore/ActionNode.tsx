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
  const borderColor = getBorderColor(action.color);

  return (
    <button
      onClick={onClick}
      className={`action-node group relative h-28 w-28 transition-all duration-300 ${
        isActive ? "scale-125" : "scale-100 hover:scale-110"
      } ${action.completed ? "opacity-40 pointer-events-none" : ""}`}
      aria-label={`${action.title}: ${action.description}`}
      aria-pressed={isActive}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-full opacity-0 blur-2xl transition-opacity duration-300 ${
          isActive ? "opacity-100" : "group-hover:opacity-40"
        } ${glowColor}`}
      />

      {/* Node circle with border gradient */}
      <div
        className={`action-node-circle absolute inset-0 rounded-full border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${
          isActive ? `border-foreground ${colorClass} shadow-lg` : `${borderColor} ${colorClass}`
        }`}
      >
        {/* Icon and Title stacked */}
        <div className="text-center space-y-1 px-4 flex flex-col items-center justify-center h-full">
          <div className="text-xl">{action.icon}</div>
          <div className="text-xs font-semibold text-foreground leading-tight max-h-12 overflow-hidden">
            {action.title}
          </div>
        </div>

        {/* Pulse animation when active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 border-foreground/30 animate-pulse" />
        )}

        {/* Completed checkmark overlay */}
        {action.completed && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground">
            ✓
          </div>
        )}
      </div>

      {/* Description tooltip on hover/active */}
      {action.description && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-3 pointer-events-none transition-all duration-300 ${
            isActive ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
          }`}
        >
          <div className="bg-foreground/95 text-background rounded-lg px-2 py-1.5 text-center whitespace-nowrap">
            <p className="text-xs">{action.description}</p>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-1.5 h-1.5 bg-foreground/95 transform rotate-45" />
        </div>
      )}
    </button>
  );
}

function getNodeColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blocked: "bg-emotion-blocked/15",
    anxious: "bg-emotion-anxious/15",
    doubt: "bg-emotion-doubt/15",
    clarity: "bg-emotion-clarity/15",
  };
  return colorMap[color] || colorMap.doubt;
}

function getBorderColor(color: string): string {
  const borderMap: Record<string, string> = {
    blocked: "border-emotion-blocked/50",
    anxious: "border-emotion-anxious/50",
    doubt: "border-emotion-doubt/50",
    clarity: "border-emotion-clarity/50",
  };
  return borderMap[color] || borderMap.doubt;
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
