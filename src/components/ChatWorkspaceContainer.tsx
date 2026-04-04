'use client';

import { ReactNode } from 'react';

type ChatWorkspaceContainerProps = {
  /** Barra superior con herramientas */
  header: ReactNode;
  /** Área principal de chat */
  chatArea: ReactNode;
  /** Panel izquierdo: conversaciones/historial */
  sidebarLeft?: ReactNode;
  /** Panel derecho: insights/objetivos */
  sidebarRight?: ReactNode;
  /** Zona de herramientas flotantes (buttons, dialogs) */
  tools?: ReactNode;
};

/**
 * ChatWorkspaceContainer - Estructura ordenada del espacio de chat
 *
 * PROPÓSITO: Presentar el chat de forma clara con zonas bien definidas
 *
 * Estructura visual:
 * ┌─────────────────────────────────────────────┐
 * │              HEADER (Toolbar)               │
 * ├──────────┬─────────────────────┬────────────┤
 * │ Sidebar  │                     │  Sidebar   │
 * │ Left     │   CHAT AREA         │  Right     │
 * │(History) │  (Main conversation)│(Insights)  │
 * │          │                     │            │
 * └──────────┴─────────────────────┴────────────┘
 */
export function ChatWorkspaceContainer({
  header,
  chatArea,
  sidebarLeft,
  sidebarRight,
  tools,
}: ChatWorkspaceContainerProps) {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* ═══════════════════════════════════════════
          HEADER: Herramientas y navegación superior
          ═══════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        {header}
      </div>

      {/* ═══════════════════════════════════════════
          MAIN WORKSPACE: 3 columnas
          ═══════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Left Panel: Historia/Conversaciones */}
        {sidebarLeft && (
          <div className="hidden lg:flex flex-col w-56 border-r border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {sidebarLeft}
            </div>
          </div>
        )}

        {/* Center: Chat Principal */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            {chatArea}
          </div>
        </div>

        {/* Right Panel: Insights y Objetivos */}
        {sidebarRight && (
          <div className="hidden xl:flex flex-col w-80 border-l border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {sidebarRight}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          TOOLS: Dialogs y componentes flotantes
          ═══════════════════════════════════════════ */}
      {tools}

      {/* Leyenda visual para propósito de cada zona */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-zinc-600 p-1 border-t border-zinc-800 bg-black/50 text-center">
          ← Historial | Centro: Chat Principal | Insights →
        </div>
      )}
    </div>
  );
}
