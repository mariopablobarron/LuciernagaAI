"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Heart, MessageCircle, X, Users, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type Avatar = {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  phase: string;
  isMe: boolean;
  entryDelay: number;
  recentPost: boolean;
};

type WallMessage = {
  id: string;
  content: string;
  author: string | null;
  heartbeats: number;
  createdAt: string;
  answers: Array<{ id: string; content: string; author: string | null }>;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const EMOJIS = ["😊", "🧘", "💪", "🤔", "😌", "🧠", "🔥", "✨", "🌊", "🦋", "🎯", "💓"];
const COLORS = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

const PHASE_EMOJI: Record<string, string> = {
  bloqueo: "🧱", exploracion: "🔍", decision: "🧭", accion: "🚀", consistencia: "🔥", neutral: "🌊",
};

const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  duration: 15 + Math.random() * 20,
  delay: Math.random() * 10,
  opacity: 0.1 + Math.random() * 0.2,
}));

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hapticFeedback(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(style === "light" ? 10 : style === "medium" ? 25 : 50);
  }
}

// ─── Floating Avatar Component ──────────────────────────────────────────────

function FloatingAvatar({
  avatar,
  onTap,
  selected,
}: {
  avatar: Avatar;
  onTap: (id: string) => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={() => { onTap(avatar.id); hapticFeedback("light"); }}
      className="absolute touch-manipulation"
      style={{
        left: `${avatar.x}%`,
        top: `${avatar.y}%`,
        transform: `translate(-50%, -50%) scale(${selected ? 1.3 : 1})`,
        transition: "left 2s ease-in-out, top 2s ease-in-out, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: selected ? 20 : 10,
        animation: `avatar-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) ${avatar.entryDelay}s both`,
      }}
      aria-label={avatar.isMe ? "Tú" : avatar.name ?? "Usuario"}
    >
      {/* Selection glow */}
      {selected && (
        <div className="absolute inset-0 -m-4 rounded-full bg-violet-500/30 blur-xl animate-pulse" />
      )}

      {/* Thought bubble */}
      {avatar.recentPost && !selected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-lg" style={{ animation: "thought-bubble 3s ease-in-out infinite" }}>
          💭
        </div>
      )}

      <div className="relative flex flex-col items-center gap-1">
        {/* Shadow on floor */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full bg-black/30 blur-sm"
          style={{ animation: `shadow-pulse ${3 + Math.random() * 2}s ease-in-out infinite` }}
        />

        {/* Avatar circle */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-2xl sm:text-3xl shadow-xl ${
            avatar.isMe ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent" : ""
          }`}
          style={{ animation: `float-avatar ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s` }}
        >
          {avatar.emoji}
        </div>

        {/* Name tag */}
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm ${
          avatar.isMe
            ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-cyan-500/20 shadow-lg"
            : "bg-zinc-900/70 text-zinc-300 border border-zinc-700/50"
        }`}>
          {avatar.isMe ? "Tú" : avatar.name?.split(" ")[0] ?? "???"}
        </span>

        {/* Phase badge */}
        <span className="text-xs drop-shadow-lg">{PHASE_EMOJI[avatar.phase] ?? "🌊"}</span>
      </div>
    </button>
  );
}

// ─── Wall Component ─────────────────────────────────────────────────────────

function MessageWall({
  messages,
  onPost,
  onHeartbeat,
  onReply,
  posting,
}: {
  messages: WallMessage[];
  onPost: (text: string) => void;
  onHeartbeat: (id: string) => void;
  onReply: (id: string, text: string) => void;
  posting: boolean;
}) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm">
        <MessageCircle className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-bold text-white">Muro de la Cafetería</span>
        <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{messages.length}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-4xl">📝</span>
            <p className="text-sm text-zinc-500">El muro está vacío.</p>
            <p className="text-xs text-zinc-600">Sé el primero en escribir algo.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id}
              className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-4 py-3 space-y-2"
              style={{ animation: `message-appear 0.4s ease-out ${i * 0.05}s both` }}
            >
              <p className="text-sm text-zinc-200 leading-relaxed">{m.content}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { onHeartbeat(m.id); hapticFeedback("medium"); }}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-fuchsia-400 active:scale-110 transition-all"
                >
                  <Heart className="w-3.5 h-3.5" fill={m.heartbeats > 0 ? "currentColor" : "none"} /> {m.heartbeats}
                </button>
                <button
                  onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}
                  className="text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                >
                  Responder
                </button>
                <span className="text-[10px] text-zinc-600 ml-auto">{m.author ?? "Anónimo"}</span>
              </div>
              {/* Answers */}
              {m.answers.map((a) => (
                <div key={a.id} className="ml-3 pl-3 border-l-2 border-violet-500/20 text-xs text-zinc-400 py-1">
                  {a.content} <span className="text-zinc-600">— {a.author ?? "Anónimo"}</span>
                </div>
              ))}
              {/* Reply form */}
              {replyTo === m.id && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tu respuesta..."
                    maxLength={500}
                    className="flex-1 rounded-lg bg-black/50 border border-zinc-700 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyText.trim()) {
                        onReply(m.id, replyText); setReplyText(""); setReplyTo(null);
                        hapticFeedback("light");
                      }
                    }}
                  />
                  <button
                    onClick={() => { onReply(m.id, replyText); setReplyText(""); setReplyTo(null); hapticFeedback("light"); }}
                    disabled={!replyText.trim()}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-white disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Post input */}
      <div className="shrink-0 border-t border-zinc-800/60 p-3 bg-zinc-900/50 backdrop-blur-sm" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe en el muro..."
            maxLength={500}
            className="flex-1 min-h-11 rounded-xl bg-black/50 border border-zinc-700 px-4 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                onPost(input); setInput(""); hapticFeedback("medium");
              }
            }}
          />
          <button
            onClick={() => { onPost(input); setInput(""); hapticFeedback("medium"); }}
            disabled={!input.trim() || posting}
            className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 disabled:opacity-40 active:scale-90 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Cafeteria Page ────────────────────────────────────────────────────

export default function CafeteriaPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showWall, setShowWall] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tokenRes, postsRes] = await Promise.all([
        fetch("/api/auth/token", { credentials: "include" }),
        fetch("/api/community/posts?type=reflection&limit=30", { credentials: "include" }),
      ]);

      const tokenData = (await tokenRes.json()) as { user?: { id: string; name: string | null } };
      const postsData = (await postsRes.json()) as { posts: Array<{
        id: string; content: string | null; feeling: string | null;
        author: { name: string } | null; heartbeats: number; createdAt: string; isOwn: boolean;
      }> };

      if (tokenData.user) {
        const me: Avatar = {
          id: tokenData.user.id,
          name: tokenData.user.name ?? "Tú",
          emoji: "💓",
          x: 50, y: 55,
          targetX: randomInRange(20, 80), targetY: randomInRange(20, 80),
          color: "from-cyan-500 to-violet-500",
          phase: "neutral",
          isMe: true,
          entryDelay: 0,
          recentPost: false,
        };

        const others: Avatar[] = [];
        const seen = new Set<string>();
        for (const p of postsData.posts ?? []) {
          if (p.isOwn || others.length >= 11) continue;
          const key = p.author?.name ?? p.id;
          if (seen.has(key)) continue;
          seen.add(key);
          const isRecent = Date.now() - new Date(p.createdAt).getTime() < 3600000; // 1h
          others.push({
            id: `av_${others.length}`,
            name: p.author?.name ?? "Alguien",
            emoji: EMOJIS[others.length % EMOJIS.length],
            x: randomInRange(10, 90), y: randomInRange(15, 85),
            targetX: randomInRange(10, 90), targetY: randomInRange(15, 85),
            color: COLORS[others.length % COLORS.length],
            phase: "neutral",
            isMe: false,
            entryDelay: 0.15 * (others.length + 1),
            recentPost: isRecent,
          });
        }

        setAvatars([me, ...others]);
      }

      setMessages(
        (postsData.posts ?? []).map((p) => ({
          id: p.id,
          content: p.feeling || p.content || "",
          author: p.author?.name ?? null,
          heartbeats: p.heartbeats,
          createdAt: p.createdAt,
          answers: [],
        })),
      );
    } catch {
      toast.error("Error al cargar la cafetería");
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // Animate avatars
  useEffect(() => {
    const interval = setInterval(() => {
      setAvatars((prev) =>
        prev.map((a) => {
          const newX = lerp(a.x, a.targetX, 0.015);
          const newY = lerp(a.y, a.targetY, 0.015);
          const dist = Math.abs(newX - a.targetX) + Math.abs(newY - a.targetY);

          return {
            ...a,
            x: newX,
            y: newY,
            targetX: dist < 1 ? randomInRange(10, 90) : a.targetX,
            targetY: dist < 1 ? randomInRange(15, 85) : a.targetY,
          };
        }),
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  async function handlePost(text: string) {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reflection", feeling: text, anonymous: true }),
      });
      hapticFeedback("heavy");
      void loadData();
    } catch { toast.error("Error"); }
    finally { setPosting(false); }
  }

  async function handleHeartbeat(postId: string) {
    await fetch("/api/community/heartbeat", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    hapticFeedback("light");
    void loadData();
  }

  async function handleReply(questionId: string, text: string) {
    if (!text.trim()) return;
    await fetch("/api/community/questions", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId: questionId, answerContent: text, anonymous: true }),
    }).catch(() => {});
    void loadData();
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden touch-manipulation select-none">
      {/* Keyframes */}
      <style>{`
        @keyframes float-avatar {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shadow-pulse {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.3; }
          50% { transform: translateX(-50%) scaleX(0.8); opacity: 0.15; }
        }
        @keyframes thought-bubble {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) translateY(-4px) scale(1.1); opacity: 1; }
        }
        @keyframes avatar-enter {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes particle-drift {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: var(--p-opacity); }
          90% { opacity: var(--p-opacity); }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
        @keyframes message-appear {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes ambient-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes wall-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05); }
          50% { box-shadow: 0 0 30px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.1); }
        }
      `}</style>

      {/* ── Ambient background ───────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient floor */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(39,39,42,0.5)_0%,rgba(9,9,11,1)_70%)]" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/5 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" style={{ animation: "ambient-glow 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/5 w-80 h-80 bg-cyan-500/6 rounded-full blur-3xl" style={{ animation: "ambient-glow 10s ease-in-out infinite 3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-500/4 rounded-full blur-3xl" style={{ animation: "ambient-glow 12s ease-in-out infinite 6s" }} />

        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              "--p-opacity": p.opacity,
              "--dx": `${(Math.random() - 0.5) * 200}px`,
              "--dy": `${(Math.random() - 0.5) * 200}px`,
              animation: `particle-drift ${p.duration}s linear ${p.delay}s infinite`,
            } as React.CSSProperties}
          />
        ))}

        {/* Floor grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── HUD Header ───────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-transparent" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-3">
          <Link href="/community" className="p-2.5 -ml-2 rounded-xl text-zinc-400 hover:text-white active:scale-90 transition-all bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">☕ La Cafetería</h1>
            <p className="text-[10px] text-zinc-500 font-medium">Espacio seguro · Anónimo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-300">{avatars.length}</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── Avatars ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 pt-20 pb-24">
        {avatars.map((avatar) => (
          <FloatingAvatar
            key={avatar.id}
            avatar={avatar}
            selected={selectedAvatar === avatar.id}
            onTap={(id) => setSelectedAvatar(selectedAvatar === id ? null : id)}
          />
        ))}

        {/* Wall button (center) */}
        <button
          onClick={() => { setShowWall(true); hapticFeedback("medium"); }}
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative" style={{ animation: "wall-pulse 3s ease-in-out infinite" }}>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-900/90 border border-violet-500/30 backdrop-blur-md flex flex-col items-center justify-center gap-1.5 active:scale-90 transition-transform">
              <MessageCircle className="w-7 h-7 sm:w-9 sm:h-9 text-violet-400" />
              <span className="text-xs sm:text-sm font-bold text-violet-300">Muro</span>
              {messages.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[11px] font-bold text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                  {messages.length > 9 ? "9+" : messages.length}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* ── Selected avatar card ─────────────────────────────────── */}
      {selectedAvatar && (
        <div
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30"
          style={{ animation: "message-appear 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 shadow-2xl shadow-black/40 min-w-[220px] text-center">
            {(() => {
              const av = avatars.find((a) => a.id === selectedAvatar);
              if (!av) return null;
              return (
                <>
                  <p className="text-3xl mb-1">{av.emoji}</p>
                  <p className="text-sm font-bold text-white">{av.isMe ? "Tú" : av.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {PHASE_EMOJI[av.phase]} {av.phase.charAt(0).toUpperCase() + av.phase.slice(1)}
                  </p>
                  {av.recentPost && (
                    <p className="text-[10px] text-violet-400 mt-1">Publicó recientemente 💭</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Bottom bar (game-style) ──────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-center gap-3 py-4 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => { setShowWall(true); hapticFeedback("medium"); }}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-500/25 active:scale-95 transition-all"
        >
          <MessageCircle className="w-4 h-4" /> Ver muro
        </button>
        <Link
          href="/community"
          className="flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/80 backdrop-blur-sm px-5 py-3.5 text-sm font-medium text-zinc-300 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4" /> Comunidad
        </Link>
      </div>

      {/* ── Wall sheet ───────────────────────────────────────────── */}
      {showWall && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-shrink-0 h-16 sm:h-20 bg-black/70 backdrop-blur-md" onClick={() => setShowWall(false)} />
          <div className="flex-1 bg-zinc-900 border-t border-zinc-700/60 rounded-t-3xl overflow-hidden flex flex-col" style={{ animation: "message-appear 0.3s ease-out" }}>
            <div className="flex items-center justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            <button
              onClick={() => setShowWall(false)}
              className="absolute top-[calc(max(64px,env(safe-area-inset-top))+8px)] right-4 z-10 p-2.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <MessageWall
              messages={messages}
              onPost={handlePost}
              onHeartbeat={handleHeartbeat}
              onReply={handleReply}
              posting={posting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
