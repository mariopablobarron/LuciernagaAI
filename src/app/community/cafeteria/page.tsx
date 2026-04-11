"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Heart, MessageCircle, X, Users } from "lucide-react";
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
  isMe: boolean;
  entryDelay: number;
  message: string | null;
};

type WallMessage = {
  id: string;
  content: string;
  author: string | null;
  heartbeats: number;
  createdAt: string;
  isOwn: boolean;
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

const PROMPTS = [
  "¿Que estas sintiendo ahora mismo?",
  "¿Que has aprendido hoy sobre ti?",
  "¿Cual fue tu pequena victoria de hoy?",
  "¿Que estas evitando y por que?",
  "¿Que necesitas soltar?",
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  duration: 15 + Math.random() * 20,
  delay: Math.random() * 10,
  opacity: 0.1 + Math.random() * 0.15,
}));

function randomInRange(min: number, max: number) { return min + Math.random() * (max - min); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Floating Avatar ────────────────────────────────────────────────────────

function FloatingAvatar({ avatar, onTap, selected }: { avatar: Avatar; onTap: (id: string) => void; selected: boolean }) {
  return (
    <button
      onClick={() => onTap(avatar.id)}
      className="absolute touch-manipulation"
      style={{
        left: `${avatar.x}%`,
        top: `${avatar.y}%`,
        transform: `translate(-50%, -50%) scale(${selected ? 1.25 : 1})`,
        transition: "left 2.5s ease-in-out, top 2.5s ease-in-out, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: selected ? 20 : 10,
        animation: `avatar-enter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${avatar.entryDelay}s both`,
      }}
    >
      {/* Speech bubble */}
      {avatar.message && !selected && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 max-w-[140px] rounded-xl bg-zinc-800/90 border border-zinc-700/50 backdrop-blur-sm px-2.5 py-1.5 text-[10px] text-zinc-300 leading-tight text-center"
          style={{ animation: "speech-bubble 8s ease-in-out infinite" }}
        >
          {avatar.message.length > 60 ? avatar.message.slice(0, 57) + "..." : avatar.message}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800/90 border-r border-b border-zinc-700/50 rotate-45" />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-0.5">
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black/25 blur-sm"
          style={{ animation: `shadow-pulse ${3 + Math.random() * 2}s ease-in-out infinite` }}
        />
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg ${
            avatar.isMe ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-transparent" : ""
          }`}
          style={{ animation: `float-avatar ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s` }}
        >
          {avatar.emoji}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          avatar.isMe
            ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30"
            : "bg-zinc-900/60 text-zinc-400 border border-zinc-800/50"
        }`}>
          {avatar.isMe ? "Tu" : avatar.name?.split(" ")[0] ?? "???"}
        </span>
      </div>
    </button>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function CafeteriaPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showWallMobile, setShowWallMobile] = useState(false);
  const [posting, setPosting] = useState(false);
  const [input, setInput] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [currentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          name: tokenData.user.name ?? "Tu",
          emoji: "💓",
          x: 35, y: 50,
          targetX: randomInRange(15, 55), targetY: randomInRange(20, 80),
          color: "from-cyan-500 to-violet-500",
          isMe: true,
          entryDelay: 0,
          message: null,
        };

        const others: Avatar[] = [];
        const seen = new Set<string>();
        for (const p of postsData.posts ?? []) {
          if (p.isOwn || others.length >= 8) continue;
          const key = p.author?.name ?? p.id;
          if (seen.has(key)) continue;
          seen.add(key);
          others.push({
            id: `av_${others.length}`,
            name: p.author?.name ?? "Alguien",
            emoji: EMOJIS[others.length % EMOJIS.length],
            x: randomInRange(10, 55), y: randomInRange(15, 85),
            targetX: randomInRange(10, 55), targetY: randomInRange(15, 85),
            color: COLORS[others.length % COLORS.length],
            isMe: false,
            entryDelay: 0.1 * (others.length + 1),
            message: p.feeling || p.content || null,
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
          isOwn: p.isOwn,
        })),
      );
    } catch { toast.error("Error al cargar"); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // Animate avatars
  useEffect(() => {
    const interval = setInterval(() => {
      setAvatars((prev) =>
        prev.map((a) => {
          const newX = lerp(a.x, a.targetX, 0.012);
          const newY = lerp(a.y, a.targetY, 0.012);
          const dist = Math.abs(newX - a.targetX) + Math.abs(newY - a.targetY);
          return {
            ...a,
            x: newX, y: newY,
            targetX: dist < 1 ? randomInRange(10, 55) : a.targetX,
            targetY: dist < 1 ? randomInRange(15, 85) : a.targetY,
          };
        }),
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  async function handlePost() {
    if (!input.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reflection", feeling: input.trim(), anonymous }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Error al publicar");
        return;
      }
      setInput("");
      void loadData();
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 300);
    } catch { toast.error("Error de red"); }
    finally { setPosting(false); }
  }

  async function handleHeartbeat(postId: string) {
    await fetch("/api/community/heartbeat", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    }).catch(() => {});
    void loadData();
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden">
      <style>{`
        @keyframes float-avatar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes shadow-pulse { 0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.25; } 50% { transform: translateX(-50%) scaleX(0.8); opacity: 0.1; } }
        @keyframes avatar-enter { 0% { transform: translate(-50%,-50%) scale(0); opacity: 0; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        @keyframes speech-bubble { 0%,100% { opacity: 0.9; transform: translateX(-50%) translateY(0); } 50% { opacity: 1; transform: translateX(-50%) translateY(-3px); } }
        @keyframes particle-drift { 0% { transform: translate(0,0); opacity: 0; } 10% { opacity: var(--p-opacity); } 90% { opacity: var(--p-opacity); } 100% { transform: translate(var(--dx),var(--dy)); opacity: 0; } }
        @keyframes msg-in { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes glow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(39,39,42,0.4)_0%,rgba(9,9,11,1)_70%)]" />
        <div className="absolute top-1/4 left-1/5 w-72 h-72 bg-violet-500/6 rounded-full blur-3xl" style={{ animation: "glow 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" style={{ animation: "glow 10s ease-in-out infinite 3s" }} />
        {PARTICLES.map((p) => (
          <div key={p.id} className="absolute rounded-full bg-white" style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
            "--p-opacity": p.opacity, "--dx": `${(Math.random()-0.5)*200}px`, "--dy": `${(Math.random()-0.5)*200}px`,
            animation: `particle-drift ${p.duration}s linear ${p.delay}s infinite`,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-transparent" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-3">
          <Link href="/community" className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/50 border border-zinc-800/50">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white">☕ La Cafeteria</h1>
            <p className="text-[10px] text-zinc-500">Espacio seguro · Anonimo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-300">{avatars.length}</span>
          </div>
          {/* Mobile: show wall toggle */}
          <button onClick={() => setShowWallMobile(!showWallMobile)} className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/50 border border-zinc-800/50">
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Split layout: avatars left, wall right (desktop) */}
      <div className="h-full flex">
        {/* Avatars area */}
        <div className={`relative flex-1 pt-20 pb-4 ${showWallMobile ? "hidden" : ""} lg:block`}>
          {avatars.map((avatar) => (
            <FloatingAvatar
              key={avatar.id}
              avatar={avatar}
              selected={selectedAvatar === avatar.id}
              onTap={(id) => setSelectedAvatar(selectedAvatar === id ? null : id)}
            />
          ))}

          {/* Selected avatar card */}
          {selectedAvatar && (() => {
            const av = avatars.find((a) => a.id === selectedAvatar);
            if (!av) return null;
            return (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30" style={{ animation: "msg-in 0.3s ease-out" }}>
                <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl px-5 py-4 shadow-2xl min-w-[200px] text-center">
                  <p className="text-2xl mb-1">{av.emoji}</p>
                  <p className="text-sm font-bold text-white">{av.isMe ? "Tu" : av.name}</p>
                  {av.message && (
                    <p className="text-xs text-zinc-400 mt-2 italic leading-relaxed">"{av.message.slice(0, 100)}"</p>
                  )}
                  <button onClick={() => setSelectedAvatar(null)} className="mt-2 text-[10px] text-zinc-600 hover:text-zinc-400">Cerrar</button>
                </div>
              </div>
            );
          })()}

          {/* Mobile: bottom CTA to open wall */}
          <div className="lg:hidden absolute bottom-0 inset-x-0 z-20 flex justify-center py-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
            <button
              onClick={() => setShowWallMobile(true)}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-violet-500/20 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" /> Muro ({messages.length})
            </button>
          </div>
        </div>

        {/* Wall — always visible on desktop, toggle on mobile */}
        <div className={`${showWallMobile ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[380px] lg:max-w-[380px] border-l border-zinc-800/60 bg-zinc-900/30`}>
          {/* Wall header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50" style={{ paddingTop: showWallMobile ? "max(56px, env(safe-area-inset-top))" : undefined }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">Muro</span>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">{messages.length}</span>
            </div>
            <button onClick={() => setShowWallMobile(false)} className="lg:hidden p-1.5 text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prompt */}
          <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800/40 bg-violet-500/5">
            <p className="text-xs text-violet-300 italic">💭 {currentPrompt}</p>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <span className="text-4xl">📝</span>
                <p className="text-sm text-zinc-500">El muro esta vacio.</p>
                <p className="text-xs text-zinc-600">Se el primero en escribir algo.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3.5 py-2.5 space-y-1.5 ${
                    m.isOwn
                      ? "bg-cyan-500/10 border border-cyan-500/20"
                      : "bg-zinc-800/40 border border-zinc-700/20"
                  }`}
                  style={{ animation: `msg-in 0.3s ease-out ${i * 0.03}s both` }}
                >
                  <p className="text-sm text-zinc-200 leading-relaxed">{m.content}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleHeartbeat(m.id)}
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-fuchsia-400 active:scale-110 transition-all"
                    >
                      <Heart className="w-3 h-3" fill={m.heartbeats > 0 ? "currentColor" : "none"} /> {m.heartbeats || ""}
                    </button>
                    <span className="text-[10px] text-zinc-600 ml-auto">
                      {m.author ?? "Anonimo"} · {timeAgo(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-zinc-800/60 p-3 bg-zinc-900/50" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <button
                type="button"
                onClick={() => setAnonymous((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${anonymous ? "bg-violet-600" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${anonymous ? "left-[18px]" : "left-0.5"}`} />
              </button>
              <span className="text-[10px] text-zinc-500">{anonymous ? "Anonimo" : "Con nombre"}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe algo..."
                maxLength={500}
                className="flex-1 min-h-10 rounded-xl bg-black/50 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) void handlePost(); }}
              />
              <button
                onClick={() => void handlePost()}
                disabled={!input.trim() || posting}
                className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
