"use client";

import { useState, useRef, useEffect } from "react";
import CentralPrompt from "./CentralPrompt";
import ActionNodes from "./ActionNodes";
import ChatModal from "./ChatModal";

export type ActionNodeType = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
  order: number;
};

export type EmotionalStateType = "blocked" | "anxious" | "doubt" | "clarity";

const ACTION_NODES: ActionNodeType[] = [
  {
    id: "avoid",
    title: "Escribir lo que evitas",
    description: "Nombra eso que no quieres decir",
    icon: "📝",
    color: "blocked",
    completed: false,
    order: 0,
  },
  {
    id: "next",
    title: "Definir siguiente paso",
    description: "Qué haces cuando termines aquí",
    icon: "🎯",
    color: "clarity",
    completed: false,
    order: 1,
  },
  {
    id: "close",
    title: "Cerrar algo pendiente",
    description: "Libérate de lo que arrastras",
    icon: "✓",
    color: "doubt",
    completed: false,
    order: 2,
  },
  {
    id: "organize",
    title: "Ordenar tu cabeza",
    description: "Eso que se repite siempre",
    icon: "🧠",
    color: "anxious",
    completed: false,
    order: 3,
  },
];

export default function HomeCanvas() {
  const [emotionalState, setEmotionalState] = useState<EmotionalStateType>("doubt");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [nodes, setNodes] = useState<ActionNodeType[]>(ACTION_NODES);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map emotional states to background gradients - modernos y vibrantes
  const emotionGradients: Record<EmotionalStateType, string> = {
    blocked: "from-gray-950 via-gray-900 to-gray-950", // Gris oscuro elegante
    anxious: "from-amber-950 via-orange-900 to-amber-950", // Cálido vibrante
    doubt: "from-cyan-950 via-cyan-900 to-cyan-950", // Fresco y moderno
    clarity: "from-teal-950 via-cyan-900 to-teal-950", // Fresco y premium
  };

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setActiveNodeId(null);
  };

  const handleNodeComplete = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, completed: true } : node
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-screen w-full overflow-hidden bg-gradient-to-br ${emotionGradients[emotionalState]} transition-all duration-500`}
    >
      {/* Overlay de luz sutil en el centro */}
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent" />

      {/* Contenedor principal - centrado y sin cajas */}
      <div className="relative flex h-full flex-col items-center justify-center px-4">
        {/* Pregunta central */}
        <CentralPrompt emotionalState={emotionalState} />

        {/* Nodos distribuidos en círculo */}
        <ActionNodes
          nodes={nodes}
          activeNodeId={activeNodeId}
          onNodeClick={handleNodeClick}
          onNodeComplete={handleNodeComplete}
        />
      </div>

      {/* Chat Modal - se abre al hacer click en un nodo */}
      {showChat && activeNodeId && (
        <ChatModal
          nodeId={activeNodeId}
          node={nodes.find((n) => n.id === activeNodeId)!}
          emotionalState={emotionalState}
          onClose={handleCloseChat}
          onComplete={() => {
            handleNodeComplete(activeNodeId);
            handleCloseChat();
          }}
          onStateChange={setEmotionalState}
        />
      )}
    </div>
  );
}
