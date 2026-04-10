"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Trophy,
  Users,
  MessageCircle,
  Calendar,
  HelpCircle,
  Target,
  Send,
  CheckCircle2,
  Flame,
  Shield,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type Victory = { id: string; text: string; heartbeats: number; createdAt: string };
type Space = { id: string; slug: string; name: string; description: string; icon: string; postCount: number };
type Post = {
  id: string; type: string; feeling: string | null; blocker: string | null;
  step: string | null; content: string | null; anonymous: boolean;
  author: { name: string } | null; isOwn: boolean; heartbeats: number; createdAt: string;
};
type CircleData = {
  id: string; name: string; phase: string; description: string | null;
  myRole: string; members: Array<{ id: string; name: string | null; role: string; isMe: boolean }>;
  memberCount: number; maxMembers: number;
  currentChallenge: { title: string; description: string | null } | null;
};
type AvailableCircle = { id: string; name: string; phase: string; description: string | null; members: number; maxMembers: number };
type Commitment = { id: string; text: string; completed: boolean; author: string | null; isOwn: boolean };
type Session = {
  id: string; title: string; description: string | null; hostName: string;
  hostRole: string; scheduledAt: string; durationMin: number; meetingUrl: string | null;
  isOpen: boolean; status: string;
  circle: { id: string; name: string; phase: string } | null;
};

type Tab = "victories" | "spaces" | "circle" | "questions" | "coaches";

type Question = {
  id: string; content: string; isForMe: boolean; answerCount: number; createdAt: string;
  answers: Array<{ id: string; content: string; author: string | null; isOwn: boolean; likes: number; createdAt: string }>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "ahora";
  if (d < 60) return `hace ${d}m`;
  if (d < 1440) return `hace ${Math.floor(d / 60)}h`;
  return `hace ${Math.floor(d / 1440)}d`;
}

const PHASE_LABELS: Record<string, string> = {
  bloqueo: "Bloqueo", exploracion: "Exploración", decision: "Decisión",
  accion: "Acción", consistencia: "Consistencia",
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("victories");
  const [victories, setVictories] = useState<Victory[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacePosts, setSpacePosts] = useState<Post[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [myCircle, setMyCircle] = useState<CircleData | null>(null);
  const [availableCircles, setAvailableCircles] = useState<AvailableCircle[]>([]);
  const [circlePosts, setCirclePosts] = useState<Post[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Post form state
  const [postFeeling, setPostFeeling] = useState("");
  const [postBlocker, setPostBlocker] = useState("");
  const [postStep, setPostStep] = useState("");
  const [commitText, setCommitText] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === "victories") {
        const res = await fetch("/api/community/victories", { credentials: "include" });
        const data = (await res.json()) as { victories: Victory[] };
        setVictories(data.victories ?? []);
      } else if (t === "spaces") {
        const res = await fetch("/api/community/spaces", { credentials: "include" });
        const data = (await res.json()) as { spaces: Space[] };
        setSpaces(data.spaces ?? []);
      } else if (t === "circle") {
        const res = await fetch("/api/community/circles", { credentials: "include" });
        const data = (await res.json()) as { myCircle: CircleData | null; available: AvailableCircle[] };
        setMyCircle(data.myCircle);
        setAvailableCircles(data.available ?? []);
        if (data.myCircle) {
          const [postsRes, commitsRes] = await Promise.all([
            fetch(`/api/community/posts?circleId=${data.myCircle.id}`, { credentials: "include" }),
            fetch(`/api/community/commitments?circleId=${data.myCircle.id}`, { credentials: "include" }),
          ]);
          const postsData = (await postsRes.json()) as { posts: Post[] };
          const commitsData = (await commitsRes.json()) as { commitments: Commitment[] };
          setCirclePosts(postsData.posts ?? []);
          setCommitments(commitsData.commitments ?? []);
        }
      } else if (t === "questions") {
        const res = await fetch("/api/community/questions", { credentials: "include" });
        const data = (await res.json()) as { questions: Question[] };
        setQuestions(data.questions ?? []);
      } else if (t === "coaches") {
        const res = await fetch("/api/community/sessions", { credentials: "include" });
        const data = (await res.json()) as { sessions: Session[] };
        setSessions(data.sessions ?? []);
      }
    } catch {
      toast.error("Error al cargar la comunidad");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(tab); }, [tab, fetchData]);

  async function loadSpacePosts(spaceId: string) {
    setSelectedSpace(spaceId);
    const res = await fetch(`/api/community/posts?spaceId=${spaceId}`, { credentials: "include" });
    const data = (await res.json()) as { posts: Post[] };
    setSpacePosts(data.posts ?? []);
  }

  async function handlePost(spaceId?: string) {
    if (!postFeeling.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reflection", feeling: postFeeling, blocker: postBlocker, step: postStep,
          spaceId: spaceId ?? selectedSpace, circleId: myCircle?.id, anonymous: true,
        }),
      });
      setPostFeeling(""); setPostBlocker(""); setPostStep("");
      toast.success("Publicado");
      void fetchData(tab);
    } catch { toast.error("Error al publicar"); }
    finally { setPosting(false); }
  }

  async function handleVictoryPost() {
    if (!postFeeling.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "victory", content: postFeeling, anonymous: true }),
      });
      setPostFeeling("");
      toast.success("Victoria compartida");
      void fetchData("victories");
    } catch { toast.error("Error"); }
    finally { setPosting(false); }
  }

  async function handleHeartbeat(postId: string) {
    await fetch("/api/community/heartbeat", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    void fetchData(tab);
  }

  async function handleJoinCircle(circleId: string) {
    await fetch("/api/community/circles", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circleId }),
    });
    toast.success("Te has unido al círculo");
    void fetchData("circle");
  }

  async function handleCommitment() {
    if (!commitText.trim() || !myCircle) return;
    await fetch("/api/community/commitments", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circleId: myCircle.id, text: commitText }),
    });
    setCommitText("");
    toast.success("Compromiso registrado");
    void fetchData("circle");
  }

  async function handleAskQuestion() {
    if (!questionText.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/questions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: questionText }),
      });
      setQuestionText("");
      toast.success("Pregunta publicada");
      void fetchData("questions");
    } catch { toast.error("Error al publicar"); }
    finally { setPosting(false); }
  }

  async function handleAnswer(questionId: string) {
    if (!answerText.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/community/questions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: questionId, answerContent: answerText, anonymous: false }),
      });
      setAnswerText("");
      setAnsweringId(null);
      toast.success("Respuesta publicada");
      void fetchData("questions");
    } catch { toast.error("Error"); }
    finally { setPosting(false); }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "victories", label: "Victorias", icon: <Trophy className="w-4 h-4" /> },
    { key: "spaces", label: "Espacios", icon: <BookOpen className="w-4 h-4" /> },
    { key: "circle", label: "Mi Círculo", icon: <Users className="w-4 h-4" /> },
    { key: "questions", label: "Preguntas", icon: <HelpCircle className="w-4 h-4" /> },
    { key: "coaches", label: "Sesiones", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Comunidad</h1>
            <p className="text-sm text-zinc-500">Círculos de transformación</p>
          </div>
        </div>

        {/* Confidentiality */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            Espacio seguro. Lo que se comparte aquí es confidencial. Publica de forma anónima si lo prefieres.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === t.key
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Victories ───────────────────────────────────────────── */}
        {tab === "victories" && (
          <div className="space-y-4">
            {/* Post victory */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Comparte una victoria</p>
              <textarea
                value={postFeeling}
                onChange={(e) => setPostFeeling(e.target.value)}
                placeholder="Hoy logré..."
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-zinc-600">Se publica de forma anónima</p>
                <button onClick={handleVictoryPost} disabled={!postFeeling.trim() || posting}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-all">
                  <Trophy className="w-3.5 h-3.5" /> Compartir
                </button>
              </div>
            </div>

            {/* Victories list */}
            {loading ? (
              <p className="text-sm text-zinc-500 text-center py-8">Cargando victorias...</p>
            ) : victories.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Trophy className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">Aún no hay victorias. Sé el primero.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {victories.map((v) => (
                  <div key={v.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">{v.text}</p>
                    <div className="flex items-center justify-between mt-3">
                      <button onClick={() => void handleHeartbeat(v.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-fuchsia-400 transition-colors">
                        <Heart className="w-3.5 h-3.5" /> {v.heartbeats}
                      </button>
                      <p className="text-[10px] text-zinc-600">{timeAgo(v.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Spaces ──────────────────────────────────────────────── */}
        {tab === "spaces" && (
          <div className="space-y-4">
            {!selectedSpace ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {spaces.map((s) => (
                  <button key={s.id} onClick={() => void loadSpacePosts(s.id)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-zinc-500">{s.postCount} publicaciones</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">{s.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setSelectedSpace(null)} className="text-sm text-violet-400 hover:text-violet-300">
                  ← Volver a espacios
                </button>
                {/* Post form */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                  <p className="text-sm font-semibold text-white">Comparte tu reflexión</p>
                  <input value={postFeeling} onChange={(e) => setPostFeeling(e.target.value)}
                    placeholder="Hoy me siento..." maxLength={500}
                    className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
                  <input value={postBlocker} onChange={(e) => setPostBlocker(e.target.value)}
                    placeholder="Lo que me frena es..." maxLength={500}
                    className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
                  <input value={postStep} onChange={(e) => setPostStep(e.target.value)}
                    placeholder="Mi paso de hoy es..." maxLength={500}
                    className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
                  <button onClick={() => void handlePost()} disabled={!postFeeling.trim() || posting}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-all">
                    <Send className="w-3.5 h-3.5" /> Publicar
                  </button>
                </div>
                {/* Space posts */}
                {spacePosts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                    {p.feeling && <p className="text-sm text-zinc-300">{p.feeling}</p>}
                    {p.blocker && <p className="text-xs text-zinc-500 italic">{p.blocker}</p>}
                    {p.step && <p className="text-xs text-cyan-400">{p.step}</p>}
                    <div className="flex items-center justify-between pt-1">
                      <button onClick={() => void handleHeartbeat(p.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-fuchsia-400 transition-colors">
                        <Heart className="w-3.5 h-3.5" /> {p.heartbeats}
                      </button>
                      <p className="text-[10px] text-zinc-600">{timeAgo(p.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Circle ──────────────────────────────────────────────── */}
        {tab === "circle" && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-zinc-500 text-center py-8">Cargando...</p>
            ) : !myCircle ? (
              <div className="space-y-4">
                <div className="text-center py-8 space-y-2">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto" />
                  <p className="text-white font-semibold">Aún no tienes círculo</p>
                  <p className="text-sm text-zinc-500">Únete a un grupo de 5-8 personas en tu misma fase</p>
                </div>
                {availableCircles.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {availableCircles.map((c) => (
                      <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            {PHASE_LABELS[c.phase] ?? c.phase}
                          </span>
                        </div>
                        {c.description && <p className="text-xs text-zinc-400">{c.description}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">{c.members}/{c.maxMembers} personas</span>
                          <button onClick={() => void handleJoinCircle(c.id)}
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-all">
                            Unirme
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Circle header */}
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-white">{myCircle.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">
                        {PHASE_LABELS[myCircle.phase] ?? myCircle.phase}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{myCircle.memberCount}/{myCircle.maxMembers}</p>
                  </div>
                  {/* Members */}
                  <div className="flex flex-wrap gap-2">
                    {myCircle.members.map((m) => (
                      <span key={m.id} className={`text-xs px-2 py-1 rounded-full border ${
                        m.isMe ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-zinc-700 text-zinc-400"
                      }`}>
                        {m.name ?? "Anónimo"} {m.role !== "member" && `(${m.role})`}
                      </span>
                    ))}
                  </div>
                  {/* Challenge */}
                  {myCircle.currentChallenge && (
                    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Reto de la semana
                      </p>
                      <p className="text-sm text-white mt-1">{myCircle.currentChallenge.title}</p>
                    </div>
                  )}
                </div>

                {/* Daily commitment */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" /> Compromiso de hoy
                  </p>
                  <div className="flex gap-2">
                    <input value={commitText} onChange={(e) => setCommitText(e.target.value)}
                      placeholder="Hoy voy a..."
                      className="flex-1 rounded-lg border border-zinc-700 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
                    <button onClick={() => void handleCommitment()} disabled={!commitText.trim()}
                      className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {commitments.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${c.completed ? "text-emerald-400" : "text-zinc-600"}`} />
                      <span className={c.completed ? "text-zinc-500 line-through" : "text-zinc-300"}>{c.text}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto">{c.author}</span>
                    </div>
                  ))}
                </div>

                {/* Circle posts */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-400" /> Tablón del círculo
                  </p>
                  {circlePosts.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">Aún no hay publicaciones en tu círculo.</p>
                  ) : circlePosts.map((p) => (
                    <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
                      {p.feeling && <p className="text-sm text-zinc-300">{p.feeling}</p>}
                      {p.blocker && <p className="text-xs text-zinc-500 italic">{p.blocker}</p>}
                      {p.step && <p className="text-xs text-cyan-400">{p.step}</p>}
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => void handleHeartbeat(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-fuchsia-400">
                          <Heart className="w-3 h-3" /> {p.heartbeats}
                        </button>
                        <p className="text-[10px] text-zinc-600">{p.anonymous ? "Anónimo" : p.author?.name} · {timeAgo(p.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Questions (ask.fm style) ────────────────────────────── */}
        {tab === "questions" && (
          <div className="space-y-4">
            {/* Ask */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-violet-400" /> Pregunta a la comunidad
              </p>
              <p className="text-xs text-zinc-500">
                Las preguntas son anónimas. Nadie sabe quién pregunta. Las respuestas pueden ser anónimas o con nombre.
              </p>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="¿Qué te gustaría preguntar?"
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-zinc-600">{questionText.length}/500 · Anónima</p>
                <button
                  onClick={() => void handleAskQuestion()}
                  disabled={!questionText.trim() || posting}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Preguntar
                </button>
              </div>
            </div>

            {/* Questions list */}
            {loading ? (
              <p className="text-sm text-zinc-500 text-center py-8">Cargando preguntas...</p>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HelpCircle className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">Aún no hay preguntas. Sé el primero.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    {/* Question */}
                    <div className="p-5">
                      <p className="text-base text-white font-medium leading-relaxed">{q.content}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                        <span>{q.answerCount} {q.answerCount === 1 ? "respuesta" : "respuestas"}</span>
                        <span>{timeAgo(q.createdAt)}</span>
                        {q.isForMe && (
                          <span className="text-cyan-400 font-semibold">Para ti</span>
                        )}
                      </div>
                    </div>

                    {/* Answers */}
                    {q.answers.length > 0 && (
                      <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                        {q.answers.map((a) => (
                          <div key={a.id} className="px-5 py-3 bg-zinc-950/50">
                            <p className="text-sm text-zinc-300 leading-relaxed">{a.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                              <span>{a.author ?? "Anónimo"}</span>
                              <span>{timeAgo(a.createdAt)}</span>
                              <button className="inline-flex items-center gap-1 hover:text-fuchsia-400 transition-colors">
                                <Heart className="w-3 h-3" /> {a.likes}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer form */}
                    <div className="border-t border-zinc-800 p-4">
                      {answeringId === q.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Tu respuesta..."
                            rows={2}
                            maxLength={1000}
                            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void handleAnswer(q.id)}
                              disabled={!answerText.trim() || posting}
                              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                            >
                              Responder
                            </button>
                            <button
                              onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAnsweringId(q.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                        >
                          Responder a esta pregunta
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Sessions ────────────────────────────────────────────── */}
        {tab === "coaches" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Sesiones grupales con profesionales. Abiertas para toda la comunidad o específicas de tu círculo.</p>
            {loading ? (
              <p className="text-sm text-zinc-500 text-center py-8">Cargando sesiones...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Calendar className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">No hay sesiones programadas</p>
                <p className="text-xs text-zinc-600">Las sesiones se anuncian por email y Telegram</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">{s.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {s.hostName} · {s.hostRole === "coach" ? "Coach" : "Psicólogo/a"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      s.status === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 text-zinc-400"
                    }`}>
                      {s.status === "live" ? "En directo" : new Date(s.scheduledAt).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-zinc-400">{s.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{s.durationMin} min</span>
                    {s.isOpen && <span className="text-cyan-400">Abierta a todos</span>}
                    {s.circle && <span>Círculo: {s.circle.name}</span>}
                  </div>
                  {s.meetingUrl && s.status === "live" && (
                    <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-all">
                      Unirse ahora
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
