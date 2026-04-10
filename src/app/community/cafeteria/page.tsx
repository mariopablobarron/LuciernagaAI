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
  phase: string;
  isMe: boolean;
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

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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
      onClick={() => onTap(avatar.id)}
      className={`absolute transition-transform duration-[2000ms] ease-in-out touch-manipulation ${
        selected ? "z-20 scale-125" : "z-10"
      }`}
      style={{
        left: `${avatar.x}%`,
        top: `${avatar.y}%`,
        transform: `translate(-50%, -50%) ${selected ? "scale(1.25)" : "scale(1)"}`,
      }}
      aria-label={avatar.isMe ? "Tú" : avatar.name ?? "Usuario"}
    >
      {/* Glow */}
      {selected && (
        <div className="absolute inset-0 -m-3 rounded-full bg-violet-500/30 blur-xl animate-pulse" />
      )}
      {/* Bubble */}
      <div className={`relative flex flex-col items-center gap-1`}>
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg ${
            avatar.isMe ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950" : ""
          }`}
          style={{
            animation: `float-avatar ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          {avatar.emoji}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          avatar.isMe
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            : "bg-zinc-800/80 text-zinc-400"
        }`}>
          {avatar.isMe ? "Tú" : avatar.name?.split(" ")[0] ?? "???"}
        </span>
        {/* Phase indicator */}
        <span className="text-[8px]">{PHASE_EMOJI[avatar.phase] ?? "🌊"}</span>
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
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <MessageCircle className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">Muro</span>
        <span className="text-xs text-zinc-500">{messages.length} mensajes</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">El muro está vacío. Sé el primero.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-lg bg-zinc-800/40 px-3 py-2.5 space-y-1.5">
              <p className="text-sm text-zinc-200 leading-relaxed">{m.content}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onHeartbeat(m.id)}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-fuchsia-400 active:scale-90 transition-all"
                >
                  <Heart className="w-3 h-3" /> {m.heartbeats}
                </button>
                <button
                  onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}
                  className="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors"
                >
                  Responder
                </button>
                <span className="text-[9px] text-zinc-600 ml-auto">{m.author ?? "Anónimo"}</span>
              </div>
              {/* Inline answers */}
              {m.answers.map((a) => (
                <div key={a.id} className="ml-3 pl-2 border-l border-zinc-700/50 text-xs text-zinc-400 mt-1">
                  {a.content} <span className="text-zinc-600">— {a.author ?? "Anónimo"}</span>
                </div>
              ))}
              {/* Reply form */}
              {replyTo === m.id && (
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tu respuesta..."
                    maxLength={500}
                    className="flex-1 rounded-md bg-black/40 border border-zinc-700 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyText.trim()) {
                        onReply(m.id, replyText);
                        setReplyText("");
                        setReplyTo(null);
                      }
                    }}
                  />
                  <button
                    onClick={() => { onReply(m.id, replyText); setReplyText(""); setReplyTo(null); }}
                    disabled={!replyText.trim()}
                    className="rounded-md bg-violet-600 px-2 py-1 text-white disabled:opacity-40"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Post input */}
      <div className="shrink-0 border-t border-zinc-800/60 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe en el muro..."
            maxLength={500}
            className="flex-1 min-h-11 rounded-xl bg-black/40 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                onPost(input);
                setInput("");
              }
            }}
          />
          <button
            onClick={() => { onPost(input); setInput(""); }}
            disabled={!input.trim() || posting}
            className="h-11 w-11 shrink-0 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-40 active:scale-95 transition-all"
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
  const [userId, setUserId] = useState<string | null>(null);
  const animRef = useRef<number | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [tokenRes, postsRes] = await Promise.all([
        fetch("/api/auth/token", { credentials: "include" }),
        fetch("/api/community/posts?type=reflection&limit=30", { credentials: "include" }),
      ]);

      const tokenData = (await tokenRes.json()) as { user?: { id: string; name: string | null } };
      const postsData = (await postsRes.json()) as { posts: Array<{
        id: string; content: string | null; feeling: string | null;
        author: { name: string } | null; heartbeats: number; createdAt: string;
        isOwn: boolean;
      }> };

      if (tokenData.user) {
        setUserId(tokenData.user.id);

        // Generate avatars — me + simulated presence
        const me: Avatar = {
          id: tokenData.user.id,
          name: tokenData.user.name ?? "Tú",
          emoji: "💓",
          x: 50,
          y: 50,
          targetX: randomInRange(15, 85),
          targetY: randomInRange(15, 85),
          color: "from-cyan-500 to-violet-500",
          phase: "neutral",
          isMe: true,
        };

        // Generate others from post authors (deduped, anonymized)
        const others: Avatar[] = [];
        const seen = new Set<string>();
        for (const p of postsData.posts ?? []) {
          if (p.isOwn || others.length >= 11) continue;
          const key = p.author?.name ?? p.id;
          if (seen.has(key)) continue;
          seen.add(key);
          others.push({
            id: `av_${others.length}`,
            name: p.author?.name ?? "Alguien",
            emoji: EMOJIS[others.length % EMOJIS.length],
            x: randomInRange(10, 90),
            y: randomInRange(10, 90),
            targetX: randomInRange(10, 90),
            targetY: randomInRange(10, 90),
            color: COLORS[others.length % COLORS.length],
            phase: "neutral",
            isMe: false,
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

  // Animate avatars — slowly drift to new positions
  useEffect(() => {
    const interval = setInterval(() => {
      setAvatars((prev) =>
        prev.map((a) => {
          // Move toward target
          const newX = lerp(a.x, a.targetX, 0.02);
          const newY = lerp(a.y, a.targetY, 0.02);

          // If close to target, pick a new one
          const dist = Math.abs(newX - a.targetX) + Math.abs(newY - a.targetY);
          const newTarget = dist < 1;

          return {
            ...a,
            x: newX,
            y: newY,
            targetX: newTarget ? randomInRange(10, 90) : a.targetX,
            targetY: newTarget ? randomInRange(10, 90) : a.targetY,
          };
        }),
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Post to wall
  async function handlePost(text: string) {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reflection", feeling: text, anonymous: true }),
      });
      void loadData();
    } catch { toast.error("Error"); }
    finally { setPosting(false); }
  }

  async function handleHeartbeat(postId: string) {
    await fetch("/api/community/heartbeat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    void loadData();
  }

  async function handleReply(questionId: string, text: string) {
    if (!text.trim()) return;
    await fetch("/api/community/questions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId: questionId, answerContent: text, anonymous: true }),
    }).catch(() => {});
    void loadData();
  }

  const onlineCount = avatars.length;

  return (
    <div className="fixed inset-0 bg-zinc-950 overflow-hidden touch-manipulation select-none">
      {/* CSS for floating animation */}
      <style>{`
        @keyframes float-avatar {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ambient-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/8 rounded-full blur-3xl" style={{ animation: "ambient-glow 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/6 rounded-full blur-3xl" style={{ animation: "ambient-glow 10s ease-in-out infinite 2s" }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-fuchsia-500/5 rounded-full blur-3xl" style={{ animation: "ambient-glow 12s ease-in-out infinite 4s" }} />
      </div>

      {/* Floor grid (subtle) */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header HUD */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-transparent">
        <div className="flex items-center gap-3">
          <Link href="/community" className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">☕ La Cafetería</h1>
            <p className="text-[10px] text-zinc-500">Espacio seguro · Todo anónimo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300">{onlineCount}</span>
            <Users className="w-3 h-3 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Avatars field */}
      <div className="absolute inset-0 pt-16 pb-20">
        {avatars.map((avatar) => (
          <FloatingAvatar
            key={avatar.id}
            avatar={avatar}
            selected={selectedAvatar === avatar.id}
            onTap={(id) => setSelectedAvatar(selectedAvatar === id ? null : id)}
          />
        ))}

        {/* Wall button (center-ish) */}
        <button
          onClick={() => setShowWall(true)}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-2xl bg-violet-500/10 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900/80 border border-violet-500/30 backdrop-blur-sm flex flex-col items-center justify-center gap-1 shadow-2xl shadow-violet-500/20 active:scale-95 transition-transform">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-violet-400" />
              <span className="text-[10px] sm:text-xs font-semibold text-violet-300">Muro</span>
              {messages.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-fuchsia-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {messages.length > 9 ? "9+" : messages.length}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Selected avatar info */}
      {selectedAvatar && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-md px-5 py-3 shadow-2xl min-w-[200px] text-center">
            {(() => {
              const av = avatars.find((a) => a.id === selectedAvatar);
              if (!av) return null;
              return (
                <>
                  <p className="text-2xl">{av.emoji}</p>
                  <p className="text-sm font-semibold text-white mt-1">{av.isMe ? "Tú" : av.name}</p>
                  <p className="text-[10px] text-zinc-500">{PHASE_EMOJI[av.phase]} {av.phase}</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bottom bar — mobile game style */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-center gap-4 py-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
        <button
          onClick={() => setShowWall(true)}
          className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 active:scale-95 transition-all"
        >
          <MessageCircle className="w-4 h-4" /> Ver muro
        </button>
        <Link
          href="/community"
          className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-5 py-3 text-sm font-medium text-zinc-300 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4" /> Comunidad
        </Link>
      </div>

      {/* Wall panel (slide-up sheet) */}
      {showWall && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-shrink-0 h-16 sm:h-24 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWall(false)}
          />
          {/* Sheet */}
          <div className="flex-1 bg-zinc-900 border-t border-zinc-700/60 rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex items-center justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowWall(false)}
                className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
