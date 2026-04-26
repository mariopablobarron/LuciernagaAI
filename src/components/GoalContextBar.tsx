"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

type GoalAction = {
  id: string;
  description: string;
  completed: boolean;
};

type GoalContextBarProps = {
  goal: {
    title: string;
    progress: number;
    completedCount: number;
    totalCount: number;
    actions: GoalAction[];
  } | null;
  actionLock?: { message: string; actionTitle: string } | null;
  onToggleAction?: (actionId: string, completed: boolean) => void;
};

export default function GoalContextBar({ goal, actionLock, onToggleAction }: GoalContextBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (!goal && !actionLock) return null;

  const pendingActions = goal?.actions.filter((a) => !a.completed) ?? [];
  const nextAction = pendingActions[0];

  return (
    <div className="xl:hidden border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
      {/* Compact bar */}
      <div className="flex items-center justify-between gap-2 w-full px-4 py-2.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          {actionLock ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-300 truncate">
                {actionLock.actionTitle}
              </span>
            </>
          ) : nextAction ? (
            <>
              <Target className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-300 truncate">
                {nextAction.description}
              </span>
            </>
          ) : goal ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-emerald-300 truncate">
                Meta completada: {goal.title}
              </span>
            </>
          ) : null}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {nextAction && onToggleAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAction(nextAction.id, true);
              }}
              title="Marcar acción como hecha"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Hecho
            </button>
          )}
          {goal && (
            <span className="text-xs text-zinc-500 font-medium">
              {goal.completedCount}/{goal.totalCount}
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Cerrar detalle" : "Ver más"}
            className="p-0.5"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded drawer */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 animate-in slide-in-from-top-1 duration-150">
          {goal && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">{goal.title}</p>
                <span className="text-xs text-zinc-500">{goal.progress}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <div className="space-y-1">
                {goal.actions.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onToggleAction?.(a.id, !a.completed)}
                    className="flex items-center gap-2 w-full text-left py-1"
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                      a.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-zinc-600"
                    }`}>
                      {a.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-xs ${a.completed ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                      {a.description}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {actionLock && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-300">{actionLock.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
