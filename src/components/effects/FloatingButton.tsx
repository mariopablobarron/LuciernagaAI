'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface FloatingButtonProps {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
}

const positionMap = {
  'bottom-right': 'bottom-8 right-8',
  'bottom-left': 'bottom-8 left-8',
  'top-right': 'top-8 right-8',
  'top-left': 'top-8 left-8',
};

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

export function FloatingButton({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  size = 'md',
}: FloatingButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div className={`fixed ${positionMap[position]} z-50`}>
      <div className="relative">
        {/* Pulsing background effect */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 blur-lg opacity-75 transition-all duration-300 ${
            isHovered ? 'scale-110 opacity-100' : 'scale-100'
          }`}
        />

        {/* Button */}
        <button
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`${sizeMap[size]} relative flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 active:scale-95 hover:scale-110`}
          aria-label={label}
        >
          {icon}
        </button>
      </div>

      {/* Tooltip */}
      {label && isHovered && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
          {label}
        </div>
      )}
    </div>
  );
}
