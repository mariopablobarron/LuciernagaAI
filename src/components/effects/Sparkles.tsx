'use client';

import React from 'react';

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  color?: 'cyan' | 'violet' | 'fuchsia';
}

const colorMap = {
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
  fuchsia: 'bg-fuchsia-400',
};

export function Sparkles({
  children,
  className = '',
  color = 'cyan',
}: SparklesProps) {
  const sparkles = Array.from({ length: 6 });

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Sparkles */}
      {sparkles.map((_, i) => (
        <div
          key={i}
          className={`absolute ${colorMap[color]} rounded-full opacity-0 animate-sparkle`}
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}

      {/* Content */}
      {children}
    </div>
  );
}
