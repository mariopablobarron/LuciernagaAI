'use client';

import React, { useState } from 'react';

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
  const [sparkles] = useState(() =>
    Array.from({ length: 6 }, () => ({
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
    })),
  );

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <div
          key={i}
          className={`absolute ${colorMap[color]} rounded-full opacity-0 animate-sparkle`}
          style={{
            width: `${s.width}px`,
            height: `${s.height}px`,
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}

      {/* Content */}
      {children}
    </div>
  );
}
