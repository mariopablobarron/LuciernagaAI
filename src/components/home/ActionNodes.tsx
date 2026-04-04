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

  // Colores para los nodos - minimalista premium con vibrancia
  const emotionColors: Record<string, { bg: string; border: string; glow: string; text: string; accent: string }> = {
    blocked: {
      bg: "bg-gradient-to-br from-gray-800 to-gray-700",
      border: "border-gray-600/50",
      glow: "shadow-[0_0_40px_rgba(75,85,99,0.4)]",
      text: "text-gray-100",
      accent: "hover:from-gray-700 hover:to-gray-600",
    },
    anxious: {
      bg: "bg-gradient-to-br from-orange-700 to-amber-600",
      border: "border-orange-500/50",
      glow: "shadow-[0_0_40px_rgba(217,119,6,0.5)]",
      text: "text-orange-50",
      accent: "hover:from-orange-600 hover:to-amber-500",
    },
    doubt: {
      bg: "bg-gradient-to-br from-cyan-700 to-cyan-600",
      border: "border-cyan-500/50",
      glow: "shadow-[0_0_40px_rgba(34,211,238,0.5)]",
      text: "text-cyan-50",
      accent: "hover:from-cyan-600 hover:to-cyan-500",
    },
    clarity: {
      bg: "bg-gradient-to-br from-cyan-600 to-teal-500",
      border: "border-cyan-400/50",
      glow: "shadow-[0_0_40px_rgba(34,211,238,0.5)]",
      text: "text-cyan-50",
      accent: "hover:from-cyan-500 hover:to-teal-400",
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
              className={`group relative flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-300 cursor-pointer ${colors.bg} ${colors.border} ${colors.accent} ${
                isActive ? `${colors.glow} scale-125` : "hover:scale-110"
              }`}
            >
              {/* Efecto de brillo sutil */}
              <div
                className={`pointer-events-none absolute -inset-4 rounded-2xl bg-radial-gradient from-white/5 via-transparent to-transparent blur-xl transition-opacity duration-300 ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                }`}
              />

              {/* Icono - más grande y legible */}
              <div className="relative text-3xl sm:text-4xl drop-shadow-sm">{node.icon}</div>

              {/* Título - tipografía más bold */}
              <p className={`relative text-xs sm:text-sm font-bold leading-tight ${colors.text} transition-colors mt-2`}>
                {node.title.split(" ").slice(0, 2).join(" ")}
              </p>

              {/* Indicador de completado */}
              {node.completed && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg">
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
