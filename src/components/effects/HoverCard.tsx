'use client';

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: 'lift' | 'glow' | 'rotate' | 'scale';
}

const effectMap = {
  lift: 'hover:translate-y-[-8px] hover:shadow-2xl',
  glow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]',
  rotate: 'hover:rotate-1',
  scale: 'hover:scale-105',
};

export function HoverCard({
  children,
  className = '',
  hoverEffect = 'lift',
}: HoverCardProps) {
  return (
    <div
      className={`
        transition-all duration-300 ease-out
        ${effectMap[hoverEffect]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
