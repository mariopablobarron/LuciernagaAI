'use client';

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}

export function AnimatedBorder({
  children,
  className = '',
  borderColor = 'from-cyan-500 to-violet-500',
}: AnimatedBorderProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Animated gradient border */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${borderColor} rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity`}
      />
      {/* Content */}
      <div className="relative bg-zinc-950 rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}
