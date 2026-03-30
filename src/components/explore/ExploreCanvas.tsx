"use client";

import { useEffect, useRef, useState } from "react";
import ActionNode from "./ActionNode";
import UserCore from "./UserCore";
import ActionModal from "./ActionModal";
import ProgressIndicator from "./ProgressIndicator";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

type ActionNode = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
  order: number;
};

type UserState = {
  emotionalState: "blocked" | "anxious" | "doubt" | "clarity";
  completedActions: number;
  totalActions: number;
};

type ExploreCanvasProps = {
  actions: ActionNode[];
  userState: UserState;
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onActionComplete: (nodeId: string) => void;
  onReset: () => void;
};

// Calculate node positions in a circular arrangement
const calculateNodePosition = (
  index: number,
  total: number,
  centerX: number,
  centerY: number,
  radius: number
) => {
  const angle = (index * (360 / total) * Math.PI) / 180;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  return { x, y };
};

export default function ExploreCanvas({
  actions,
  userState,
  activeNodeId,
  onNodeClick,
  onActionComplete,
  onReset,
}: ExploreCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedAction, setSelectedAction] = useState<ActionNode | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  // Responsive radius based on screen size
  const radius = Math.min(containerSize.width, containerSize.height) * 0.25;

  const activeAction = actions.find((a) => a.id === activeNodeId);

  // Filter visible actions (not completed, ordered by priority)
  const visibleActions = actions
    .filter((a) => !a.completed)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4); // Show max 4 nodes around the user

  return (
    <div
      ref={containerRef}
      className="explore-canvas relative h-full w-full overflow-hidden"
    >
      {/* Animated background gradient based on emotional state */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${getBackgroundClass(
          userState.emotionalState
        )}`}
      />

      {/* Decorative circles */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-border/30 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-border/20 pointer-events-none" />
      </div>

      {/* SVG connecting lines */}
      {containerSize.width > 0 && visibleActions.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none" width={containerSize.width} height={containerSize.height}>
          {visibleActions.map((action, index) => {
            const pos = calculateNodePosition(
              index,
              visibleActions.length,
              centerX,
              centerY,
              radius
            );
            return (
              <line
                key={`line-${action.id}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke={`var(--color-${getColorVar(action.color)})`}
                strokeWidth="1.5"
                opacity="0.2"
                strokeDasharray="4,4"
              />
            );
          })}
        </svg>
      )}

      {/* Central user node */}
      {containerSize.width > 0 && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <UserCore state={userState} />
        </div>
      )}

      {/* Action nodes in circular arrangement */}
      {containerSize.width > 0 &&
        visibleActions.map((action, index) => {
          const pos = calculateNodePosition(
            index,
            visibleActions.length,
            centerX,
            centerY,
            radius
          );

          const isActive = activeNodeId === action.id;

          return (
            <div
              key={action.id}
              className="absolute z-20"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <ActionNode
                action={action}
                isActive={isActive}
                onClick={() => {
                  onNodeClick(action.id);
                  setSelectedAction(action);
                }}
              />
            </div>
          );
        })}

      {/* Progress indicator */}
      <div className="absolute bottom-6 left-6 z-30">
        <ProgressIndicator
          completed={userState.completedActions}
          total={userState.totalActions}
        />
      </div>

      {/* Reset button */}
      {userState.completedActions > 0 && (
        <button
          onClick={onReset}
          className="absolute top-6 right-6 z-30 p-2 rounded-xl border border-border/50 bg-card/50 hover:bg-card/70 transition-colors group"
          title="Reiniciar exploración"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      )}

      {/* Motivational message */}
      {visibleActions.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-center space-y-4">
            <div className="text-4xl">✨</div>
            <p className="text-lg font-semibold text-foreground">
              ¡Lo lograste!
            </p>
            <p className="text-sm text-muted-foreground">
              Completaste todas las acciones de hoy.
            </p>
            <button
              onClick={onReset}
              className="mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Comenzar nuevo ciclo
            </button>
          </div>
        </div>
      )}

      {/* Action modal */}
      {selectedAction && (
        <ActionModal
          action={selectedAction}
          isOpen={activeNodeId === selectedAction.id}
          onClose={() => {
            setSelectedAction(null);
          }}
          onComplete={() => {
            onActionComplete(selectedAction.id);
            setSelectedAction(null);
          }}
        />
      )}

      {/* Initial guidance text */}
      {userState.completedActions === 0 && visibleActions.length > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            Empieza por lo que más te cuesta decir.
          </p>
          <p className="text-xs text-muted-foreground">
            No necesitas tenerlo claro.
          </p>
        </div>
      )}
    </div>
  );
}

function getBackgroundClass(emotionalState: string): string {
  const bgMap: Record<string, string> = {
    blocked: "bg-gradient-to-br from-emotion-blocked/10 via-background to-muted/10",
    anxious: "bg-gradient-to-br from-emotion-anxious/10 via-background to-muted/10",
    doubt: "bg-gradient-to-br from-emotion-doubt/10 via-background to-muted/10",
    clarity: "bg-gradient-to-br from-emotion-clarity/10 via-background to-muted/10",
  };
  return bgMap[emotionalState] || bgMap.doubt;
}

function getColorVar(color: string): string {
  const colorMap: Record<string, string> = {
    blocked: "emotion-blocked",
    anxious: "emotion-anxious",
    doubt: "emotion-doubt",
    clarity: "emotion-clarity",
  };
  return colorMap[color] || colorMap.doubt;
}
