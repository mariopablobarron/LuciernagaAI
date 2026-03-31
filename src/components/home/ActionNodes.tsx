"use client";

import { useEffect, useState } from "react";
import type { ActionNodeType } from "./HomeCanvas";

interface ActionNodesProps {
  nodes: ActionNodeType[];
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeComplete: (nodeId: string) => void;
}

export default function ActionNodes({
  nodes,
  activeNodeId,
  onNodeClick,
}: ActionNodesProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Colores para los nodos según emoción
  const emotionColors: Record<string, { bg: string; glow: string; text: string }> = {
    blocked: {
      bg: "bg-gradient-to-br from-slate-800 to-slate-700",
      glow: "shadow-[0_0_30px_rgba(30,27,75,0.6)]",
      text: "text-slate-100",
    },
    anxious: {
      bg: "bg-gradient-to-br from-orange-800 to-red-700",
      glow: "shadow-[0_0_30px_rgba(180,83,9,0.6)]",
      text: "text-orange-100",
    },
    doubt: {
      bg: "bg-gradient-to-br from-indigo-800 to-purple-700",
      glow: "shadow-[0_0_30px_rgba(67,56,202,0.6)]",
      text: "text-indigo-100",
    },
    clarity: {
      bg: "bg-gradient-to-br from-emerald-800 to-teal-700",
      glow: "shadow-[0_0_30px_rgba(5,150,105,0.6)]",
      text: "text-emerald-100",
    },
  };

  // Calcular posiciones en círculo
  const radius = 220; // Radio del círculo (en píxeles)
  const getNodePosition = (index: number) => {
    const angle = (index * 360) / nodes.length - 90; // Comienza arriba
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    return { x, y };
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {nodes.map((node, index) => {
        const position = getNodePosition(index);
        const isActive = node.id === activeNodeId;
        const isInactive = activeNodeId && !isActive;
        const colors = emotionColors[node.color];

        return (
          <div
            key={node.id}
            style={{
              transform: isVisible
                ? `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1)`
                : `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(0)`,
              opacity: isInactive ? 0.3 : 1,
            }}
            className={`pointer-events-auto absolute transition-all duration-300`}
          >
            <button
              onClick={() => onNodeClick(node.id)}
              className={`group relative flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-white/20 p-3 text-center transition-all duration-300 hover:border-white/40 sm:h-28 sm:w-28 cursor-pointer ${colors.bg} ${
                isActive ? `${colors.glow} scale-125` : "hover:scale-110"
              }`}
            >
              {/* Glow effect on hover */}
              <div
                className={`pointer-events-none absolute -inset-4 rounded-2xl bg-radial-gradient from-white/10 via-transparent to-transparent blur-lg transition-opacity duration-300 group-hover:opacity-100 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Icono */}
              <div className="relative text-3xl sm:text-4xl">{node.icon}</div>

              {/* Título */}
              <p className={`relative text-xs font-semibold leading-tight ${colors.text} group-hover:text-white transition-colors mt-1`}>
                {node.title.split(" ").slice(0, 2).join(" ")}
              </p>

              {/* Indicador de completado */}
              {node.completed && (
                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-signal-success text-white text-xs">
                  ✓
                </div>
              )}
            </button>

            {/* Tooltip visible al hacer hover */}
            <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-3 py-2 text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {node.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
