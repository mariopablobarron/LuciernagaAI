'use client';

import React from 'react';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
  animated?: boolean;
}

export function InteractiveCard({
  children,
  className = '',
  onClick,
  gradient = true,
  animated = true,
}: InteractiveCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={`
        relative rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-6
        transition-all duration-300 overflow-hidden
        ${animated ? 'hover:border-cyan-500/50 hover:bg-zinc-900/60' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onMouseMove={animated ? handleMouseMove : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Gradient effect on hover */}
      {isHovered && gradient && (
        <div
          className="absolute w-40 h-40 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-full blur-3xl pointer-events-none"
          style={{
            left: `${position.x - 80}px`,
            top: `${position.y - 80}px`,
            transition: 'all 0.3s ease-out',
          }}
        />
      )}

      {/* Border light effect */}
      {isHovered && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at ${position.x}px ${position.y}px, rgba(34, 211, 238, 0.1), transparent 80%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
