'use client';

interface GlowProps {
  children: React.ReactNode;
  className?: string;
  color?: 'cyan' | 'violet' | 'fuchsia' | 'emerald';
  intensity?: 'low' | 'medium' | 'high';
}

const colorMap = {
  cyan: 'shadow-cyan-500/50',
  violet: 'shadow-violet-500/50',
  fuchsia: 'shadow-fuchsia-500/50',
  emerald: 'shadow-emerald-500/50',
};

const intensityMap = {
  low: 'shadow-lg',
  medium: 'shadow-2xl',
  high: 'shadow-[0_0_30px_rgba(34,211,238,0.5)]',
};

export function Glow({
  children,
  className = '',
  color = 'cyan',
  intensity = 'medium',
}: GlowProps) {
  return (
    <div className={`${intensityMap[intensity]} ${colorMap[color]} rounded-lg transition-shadow hover:shadow-[0_0_40px_rgba(34,211,238,0.7)] ${className}`}>
      {children}
    </div>
  );
}
