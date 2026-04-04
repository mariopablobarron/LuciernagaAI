/**
 * DESIGN SYSTEM - Luciernaga AI
 * 
 * Sistema global de colores, espaciados, tipografía y componentes
 * Aplicable a TODAS las páginas para coherencia visual
 */

// ════════════════════════════════════════════════════════════════
// COLORES - Paleta Fluorescente Moderna (Negro-Morado-Violet-Fuchsia-Cyan)
// ════════════════════════════════════════════════════════════════

export const COLORS = {
  // Neutrales/Base
  black: '#000000',
  zinc: {
    950: '#09090b',
    900: '#18181b',
    800: '#27272a',
    700: '#3f3f46',
  },

  // Primarios Fluorescentes
  violet: {
    500: '#a78bfa',
    400: '#c4b5fd',
    300: '#ddd6fe',
  },
  fuchsia: {
    500: '#ec4899',
    400: '#f472b6',
    300: '#f9a8d4',
  },
  cyan: {
    500: '#06b6d4',
    400: '#22d3ee',
    300: '#67e8f9',
  },

  // Estados
  emerald: {
    500: '#10b981',
    400: '#34d399',
    300: '#6ee7b7',
  },
  amber: {
    500: '#f59e0b',
    400: '#fbbf24',
    300: '#fcd34d',
  },
  red: {
    500: '#ef4444',
    400: '#f87171',
    300: '#fca5a5',
  },
} as const;

// ════════════════════════════════════════════════════════════════
// GRADIENTES - Combinaciones frecuentes
// ════════════════════════════════════════════════════════════════

export const GRADIENTS = {
  // Primario: Violeta → Fucsia
  primary: 'from-violet-500 via-fuchsia-500 to-fuchsia-400',
  
  // Secundario: Cyan → Violeta
  secondary: 'from-cyan-400 to-violet-500',
  
  // Acento: Violeta → Fucsia → Cyan
  accent: 'from-violet-500 via-fuchsia-500 to-cyan-500',
  
  // Fondo: Negro → Zinc → Morado oscuro
  background: 'from-black via-zinc-950 to-purple-950',
  
  // Éxito
  success: 'from-emerald-500 to-cyan-500',
  
  // Alerta
  warning: 'from-amber-500 to-red-500',
} as const;

// ════════════════════════════════════════════════════════════════
// ESPACIADOS
// ════════════════════════════════════════════════════════════════

export const SPACING = {
  // Cards y containers
  cardPadding: 'p-6 md:p-8',
  sectionGap: 'gap-6 md:gap-8',
  
  // Padding global
  pagePadding: 'px-4 py-8 md:px-6 lg:px-8',
  containerPadding: 'max-w-7xl mx-auto',
  
  // Bordes
  borderRadius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
  },
} as const;

// ════════════════════════════════════════════════════════════════
// TIPOGRAFÍA
// ════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  // Headings
  h1: 'text-4xl md:text-5xl lg:text-6xl font-bold',
  h2: 'text-3xl md:text-4xl font-bold',
  h3: 'text-2xl md:text-3xl font-bold',
  h4: 'text-xl md:text-2xl font-bold',
  h5: 'text-lg font-semibold',
  
  // Body
  body: 'text-base md:text-lg',
  bodySmall: 'text-sm md:text-base',
  bodyMicro: 'text-xs md:text-sm',
  
  // Special
  label: 'text-xs font-semibold uppercase tracking-widest',
} as const;

// ════════════════════════════════════════════════════════════════
// BREAKPOINTS
// ════════════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  mobile: 'max-w-md',        // xs-sm
  tablet: 'max-w-2xl',        // md-lg
  desktop: 'max-w-5xl',       // xl+
  wide: 'max-w-7xl',          // 2xl+
} as const;

// ════════════════════════════════════════════════════════════════
// COMPONENTES BASE - Clases reutilizables
// ════════════════════════════════════════════════════════════════

export const COMPONENTS = {
  // Cards
  card: 'rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-6',
  cardHover: 'hover:border-purple-500/50 hover:bg-zinc-900/60 transition-all',
  
  // Buttons
  buttonPrimary: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-bold rounded-lg px-4 py-2 transition-all shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50',
  buttonSecondary: 'border border-purple-500/50 text-purple-300 hover:text-fuchsia-300 hover:border-fuchsia-500/50 hover:bg-purple-500/10 transition-all rounded-lg px-4 py-2',
  buttonSmall: 'px-3 py-1.5 text-sm',
  
  // Badges
  badgeInfo: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full px-3 py-1 text-xs font-semibold',
  badgeSuccess: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-1 text-xs font-semibold',
  badgeWarning: 'bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full px-3 py-1 text-xs font-semibold',
  badgeError: 'bg-red-500/10 text-red-300 border border-red-500/30 rounded-full px-3 py-1 text-xs font-semibold',
  
  // Inputs
  inputField: 'w-full p-3 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:shadow-lg focus:shadow-fuchsia-500/30 transition-all',
  
  // Progress bar
  progressBar: 'h-1.5 bg-zinc-800/50 rounded-full overflow-hidden border border-purple-500/30',
  progressFill: 'h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-fuchsia-500/50',
  
  // Divider
  divider: 'h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent',
} as const;

// ════════════════════════════════════════════════════════════════
// LAYOUT PATTERNS - Layouts responsive comunes
// ════════════════════════════════════════════════════════════════

export const LAYOUTS = {
  // Grid responsivo
  gridHero: 'grid md:grid-cols-2 gap-6 md:gap-8 items-center',
  gridThreeCol: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
  gridTwoCol: 'grid md:grid-cols-2 gap-4 md:gap-6',
  
  // Flex patrones
  centerFlex: 'flex items-center justify-center',
  spaceBetween: 'flex items-center justify-between',
  
  // Secciones
  section: 'py-8 md:py-12 lg:py-16',
  sectionInner: 'max-w-7xl mx-auto px-4 md:px-6 lg:px-8',
} as const;

// ════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════

export const UTILS = {
  // Transiciones comunes
  transitionSmooth: 'transition-all duration-300 ease-out',
  transitionFast: 'transition-all duration-150',
  
  // Efectos
  glassEffect: 'backdrop-blur-sm bg-white/5',
  shadowGlow: 'shadow-lg shadow-fuchsia-500/30',
  
  // Bordes
  borderSubtle: 'border border-zinc-800/50',
  borderAccent: 'border border-purple-500/30',
} as const;

// ════════════════════════════════════════════════════════════════
// TEMAS POR ESTADO EMOCIONAL
// ════════════════════════════════════════════════════════════════

export const EMOTIONAL_THEMES = {
  clarity: {
    color: 'cyan',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    gradient: 'from-cyan-500 to-blue-500',
  },
  blocked: {
    color: 'red',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-300',
    gradient: 'from-red-500 to-pink-500',
  },
  anxious: {
    color: 'amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    gradient: 'from-amber-500 to-orange-500',
  },
  doubt: {
    color: 'violet',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    gradient: 'from-violet-500 to-purple-500',
  },
  neutral: {
    color: 'zinc',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    text: 'text-zinc-300',
    gradient: 'from-zinc-500 to-slate-500',
  },
} as const;
