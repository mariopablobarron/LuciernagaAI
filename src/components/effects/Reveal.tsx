"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  blur?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  once?: boolean;
};

/**
 * Reveal — fade-up + blur-out al entrar en viewport.
 * Cero dependencias externas. Respeta prefers-reduced-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  duration = 900,
  y = 32,
  blur = 8,
  className = "",
  as: Tag = "div",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: already set to visible via lazy useState initializer
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
    filter: visible ? "blur(0)" : `blur(${blur}px)`,
    transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, filter ${duration}ms ease-out ${delay}ms`,
    willChange: "opacity, transform, filter",
  };

  // @ts-expect-error dynamic JSX tag
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>;
}

/**
 * RevealWords — divide texto en palabras y las revela en cascada.
 * Cada palabra es un inline-block con marginInlineEnd explícito (0.28em),
 * evitando cualquier colapso de whitespace entre wrappers animados y
 * permitiendo wrap natural por palabra.
 */
export function RevealWords({
  text,
  baseDelay = 0,
  step = 80,
  className = "",
  wordClassName = "",
}: {
  text: string;
  baseDelay?: number;
  step?: number;
  className?: string;
  wordClassName?: string;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const last = words.length - 1;
  return (
    <span className={className}>
      {words.map((word, i) => (
        <Reveal
          key={i}
          as="span"
          delay={baseDelay + i * step}
          y={20}
          blur={6}
          duration={700}
          className={`inline-block ${wordClassName}`}
        >
          <span style={{ marginInlineEnd: i < last ? "0.28em" : 0 }}>{word}</span>
        </Reveal>
      ))}
    </span>
  );
}
