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
import AnonymousHint from "@/components/community/AnonymousHint";
import { CircleHubV2 } from "@/components/community/CircleHubV2";
import { useSession } from "@/lib/useSession";

// ─── Types ──────────────────────────────────────────────────────────────────

type Victory = { id: string; text: string; heartbeats: number; createdAt: string };
type Space = { id: string; slug: string; name: string; description: string; icon: string; postCount: number };
type Post = {
  id: string; type: string; feeling: string | null; blocker: string | null;
  step: string | null; content: string | null; anonymous: boolean;
  author: { name: string } | null; isOwn: boolean; heartbeats: number; createdAt: string;
};
type CircleData = {
  id: string; name: string; matchPattern: string; matchEmotion: string; description: string | null;
  myRole: string; members: Array<{ id: string; name: string | null; role: string; isMe: boolean }>;
  memberCount: number; maxMembers: number;
  cycleEndsAt: string | null;
};
type AvailableCircle = { id: string; name: string; description: string | null; members: number; maxMembers: number };
type Commitment = { id: string; text: string; completed: boolean; author: string | null; isOwn: boolean };
type Session = {
  id: string; title: string; description: string | null; hostName: string;
  hostRole: string; scheduledAt: string; durationMin: number; meetingUrl: string | null;
  isOpen: boolean; status: string;
  circle: { id: string; name: string; phase: string } | null;
};

type Tab = "today" | "circle" | "questions" | "coaches" | "spaces";

type QuestionAnswer = {
  id: string;
  content: string;
  author: string | null;
  isOwn: boolean;
  helpfulCount: number;
  helpfulByMe: boolean;
  createdAt: string;
};

type Question = {
  id: string;
  content: string;
  isForMe: boolean;
  answerCount: number;
  answersFull: boolean;
  crisisDetected: boolean;
  topAnswerId: string | null;
  createdAt: string;
  answers: QuestionAnswer[];
};

type QuestionsFilter = "community" | "personal" | "mine";

type GuardianClassification = {
  isPrescriptive: boolean;
  suggestedReformulation: string | null;
  reasoning: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "ahora";
  if (d < 60) return `hace ${d}m`;
  if (d < 1440) return `hace ${Math.floor(d / 60)}h`;
  return `hace ${Math.floor(d / 1440)}d`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user, loading: sessionLoading } = useSession();
  const [tab, setTab] = useState<Tab>("today");
  const [stats, setStats] = useState<{
    members: number;
    victoriesWeek: number;
    questionsWeek: number;
    activeCircles: number;
  } | null>(null);
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
  const [questionsFilter, setQuestionsFilter] = useState<QuestionsFilter>("community");
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [suggestedQuestion, setSuggestedQuestion] = useState<
    { id: string; content: string; answerCount: number } | null
  >(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [guardian, setGuardian] = useState<GuardianClassification | null>(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianBlocked, setGuardianBlocked] = useState<string | null>(null);
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
      if (t === "today") {
        // Today bundles the Cafetería card + the Victorias feed
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
        const res = await fetch(`/api/community/questions?filter=${questionsFilter}`, {
          credentials: "include",
        });
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
  }, [questionsFilter]);

  useEffect(() => { if (user) void fetchData(tab); }, [tab, fetchData, user]);

  // Deep-link: /community?tab=questions&prefill=<text> arrives from the
  // mentor chat CTA. Select the tab and pre-fill the "pedir ayuda" textarea.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const prefill = params.get("prefill");
    if (requestedTab === "questions") setTab("questions");
    if (prefill) setQuestionText(prefill);
    if (requestedTab || prefill) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      url.searchParams.delete("prefill");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community/stats", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          members: number;
          victoriesWeek: number;
          questionsWeek: number;
          activeCircles: number;
        };
        if (!cancelled) setStats(data);
      } catch {
        // silent: stats are optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function loadSpacePosts(spaceId: string) {
    setSelectedSpace(spaceId);
    const res = await fetch(`/api/community/posts?spaceId=${spaceId}`, { credentials: "include" });
    const data = (await res.json()) as { posts: Post[] };
    setSpacePosts(data.posts ?? []);
  }

  async function submitPost(payload: Record<string, unknown>, onSuccess: () => void, successText: string) {
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        toast.error(data?.message || data?.error || "Error al publicar");
        return;
      }
      onSuccess();
      toast.success(successText);
    } catch {
      toast.error("Error de red");
    }
  }

  async function handlePost(spaceId?: string) {
    if (!postFeeling.trim()) return;
    setPosting(true);
    await submitPost(
      {
        type: "reflection", feeling: postFeeling, blocker: postBlocker, step: postStep,
        spaceId: spaceId ?? selectedSpace, circleId: myCircle?.id, anonymous: true,
      },
      () => {
        setPostFeeling(""); setPostBlocker(""); setPostStep("");
        void fetchData(tab);
      },
      "Publicado",
    );
    setPosting(false);
  }

  async function handleVictoryPost() {
    if (!postFeeling.trim()) return;
    setPosting(true);
    await submitPost(
      { type: "victory", content: postFeeling, anonymous: true },
      () => {
        setPostFeeling("");
        void fetchData("today");
      },
      "Victoria compartida",
    );
    setPosting(false);
  }

  async function handleHeartbeat(postId: string) {
    await fetch("/api/community/heartbeat", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    void fetchData(tab);
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
      toast.success("Petición publicada. La verá alguien que haya pasado por algo parecido.");
      void fetchData("questions");
    } catch { toast.error("Error al publicar"); }
    finally { setPosting(false); }
  }

  async function handleCheckAnswer() {
    if (!answerText.trim()) return;
    setGuardianLoading(true);
    setGuardian(null);
    setGuardianBlocked(null);
    try {
      const res = await fetch("/api/community/questions/check-answer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: answerText }),
      });
      if (res.status === 422) {
        setGuardianBlocked("Tu mensaje fue marcado por el filtro de seguridad. Si crees que es un falso positivo, puedes publicarlo de todas formas o ajustar el texto.");
        return;
      }
      if (res.status === 429) {
        setGuardianBlocked("Has hecho muchos chequeos en poco tiempo. Puedes publicar de todas formas o esperar unos minutos.");
        return;
      }
      if (!res.ok) {
        setGuardianBlocked("No pudimos revisar tu respuesta ahora mismo. Puedes publicar de todas formas.");
        return;
      }
      const data = (await res.json()) as { classification: GuardianClassification | null };
      setGuardian(data.classification ?? null);
    } catch {
      setGuardianBlocked("Hubo un fallo al revisar tu respuesta. Puedes publicar de todas formas.");
    } finally {
      setGuardianLoading(false);
    }
  }

  async function submitAnswer(questionId: string, content: string) {
    setPosting(true);
    try {
      const res = await fetch("/api/community/questions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId: questionId, answerContent: content, anonymous: false }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        toast.error(data.message ?? "No se pudo publicar la respuesta");
        return;
      }
      setAnswerText("");
      setAnsweringId(null);
      setGuardian(null);
      setGuardianBlocked(null);
      toast.success("Respuesta publicada");
      void fetchData("questions");
    } finally {
      setPosting(false);
    }
  }

  async function handleVoteHelpful(answerId: string) {
    const res = await fetch(`/api/community/answers/${answerId}/helpful`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === "SELF_VOTE_FORBIDDEN") {
        toast.error("No puedes votar tu propia respuesta.");
      }
      return;
    }
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      voted?: boolean;
    };
    void fetchData("questions");
    // Reciprocity loop: only invite to pay it forward when the vote was
    // added (not when it was toggled off).
    if (data.voted === true) {
      void fetchSuggestedQuestion();
    }
  }

  async function fetchSuggestedQuestion() {
    try {
      const res = await fetch("/api/community/questions/suggested", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        question: { id: string; content: string; answerCount: number } | null;
      };
      if (data.question) setSuggestedQuestion(data.question);
    } catch {
      // silent
    }
  }

  const TABS: { key: Tab; label: string; hint: string; icon: React.ReactNode }[] = [
    { key: "today", label: "Hoy", hint: "Ronda del día + tus victorias", icon: <Trophy className="w-4 h-4" /> },
    { key: "circle", label: "Mi Círculo", hint: "Grupo de 5-8 en tu misma fase", icon: <Users className="w-4 h-4" /> },
    { key: "questions", label: "Ayuda mutua", hint: "Pide ayuda o responde a alguien que lo necesita", icon: <HelpCircle className="w-4 h-4" /> },
    { key: "coaches", label: "Sesiones", hint: "Encuentros con profesionales", icon: <Calendar className="w-4 h-4" /> },
    { key: "spaces", label: "Espacios", hint: "Salas temáticas", icon: <BookOpen className="w-4 h-4" /> },
  ];

  if (!sessionLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Comunidad</h1>
              <p className="text-sm text-zinc-500">Círculos de transformación</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-300" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  La comunidad es para quienes ya tienen cuenta
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Aquí se comparten victorias, dudas y compromisos reales. Para cuidar a quienes escriben,
                  solo se puede leer y responder con cuenta creada — el chat con el mentor puedes probarlo sin registrarte.
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Victorias de la semana</li>
              <li className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-cyan-400" /> Ayuda mutua entre miembros</li>
              <li className="flex items-center gap-2"><Users className="w-4 h-4 text-violet-400" /> Círculos de 5-8 personas en tu misma fase</li>
              <li className="flex items-center gap-2"><Calendar className="w-4 h-4 text-fuchsia-400" /> Sesiones en vivo con profesionales</li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/signup"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-900/50 hover:border-zinc-600 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="text-xs text-zinc-500 text-center pt-2">
              ¿Aún no lo has probado?{" "}
              <Link href="/app" className="text-violet-400 hover:text-violet-300 underline">
                Entra al chat sin cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Social proof */}
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Miembros</p>
              <p className="text-lg font-semibold text-white">{stats.members}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Victorias 7d</p>
              <p className="text-lg font-semibold text-white">{stats.victoriesWeek}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Ayudas 7d</p>
              <p className="text-lg font-semibold text-white">{stats.questionsWeek}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Círculos activos</p>
              <p className="text-lg font-semibold text-white">{stats.activeCircles}</p>
            </div>
          </div>
        ) : null}

        {/* Confidentiality */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            Espacio seguro. Lo que se comparte aquí es confidencial. Publica de forma anónima si lo prefieres.
          </p>
        </div>

        {/* Tabs */}
        <div>
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
          <p className="mt-2 text-xs text-zinc-500">
            {TABS.find((t) => t.key === tab)?.hint}
          </p>
        </div>

        {/* ── Tab: Today (Cafetería card + Victorias feed) ─────────────── */}
        {tab === "today" && (
          <div className="space-y-4">
            {/* Cafetería — ronda del día */}
            <Link
              href="/community/cafeteria"
              className="block rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">☕</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-100">La Cafetería — ronda del día</p>
                    <p className="text-xs text-amber-300/80">
                      Una pregunta. Tu respuesta primero, luego ves cómo la viven los demás.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-400">Entrar →</span>
              </div>
            </Link>

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
                <AnonymousHint />
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
              spaces.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-2">
                  <BookOpen className="w-10 h-10 text-zinc-700 mx-auto" />
                  <p className="text-white font-semibold">Todavía no hay espacios abiertos</p>
                  <p className="text-sm text-zinc-500">
                    Los espacios son salas temáticas (hábitos, decisiones, pareja, trabajo…) donde cada uno
                    comparte su paso del día. Los iremos abriendo a medida que la comunidad crezca.
                  </p>
                  <a
                    href="https://t.me/TRESMILMILLONESDELATIDOSBOT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 mt-2"
                  >
                    Avísame cuando abran
                  </a>
                </div>
              ) : (
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
              )
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
        {tab === "circle" && <CircleHubV2 />}

        {/* ── Tab: Questions (ask.fm style) ────────────────────────────── */}
        {tab === "questions" && (
          <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2">
              {([
                { key: "community", label: "Piden ayuda" },
                { key: "personal", label: "Te escriben" },
                { key: "mine", label: "Pedí yo" },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setQuestionsFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    questionsFilter === f.key
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Reciprocity card — "pay it forward" after voting helpful. */}
            {suggestedQuestion && (
              <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/8 to-violet-500/5 p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-400">
                <p className="text-xs uppercase tracking-wider text-fuchsia-300 font-semibold">
                  La cadena sigue
                </p>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  Otra persona necesita lo que tú necesitaste hace un rato.
                  <br />
                  <span className="text-zinc-400 italic">
                    «{suggestedQuestion.content.slice(0, 160)}{suggestedQuestion.content.length > 160 ? "…" : ""}»
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAnsweringId(suggestedQuestion.id);
                      setAnswerText("");
                      setGuardian(null);
                      setSuggestedQuestion(null);
                      // scroll to the specific question
                      setTimeout(() => {
                        document
                          .getElementById(`q-${suggestedQuestion.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 50);
                    }}
                    className="rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 px-4 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    Ayudar ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestedQuestion(null)}
                    className="rounded-xl px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            )}

            {/* Ask — reframed as asking for help in a reciprocity chain */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-violet-400" /> Pide ayuda. Alguien ha pasado por algo parecido.
              </p>
              <p className="text-xs text-zinc-500">
                Tu petición es anónima — nadie sabe quién pide. Quien responde
                puede hacerlo con nombre o en anónimo. Si otro día ayudas tú,
                la cadena sigue.
              </p>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Cuenta en qué estás atascado o qué duda tienes ahora mismo…"
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
              />
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-zinc-600">{questionText.length}/500 · Anónima</p>
                  <AnonymousHint />
                </div>
                <button
                  onClick={() => void handleAskQuestion()}
                  disabled={!questionText.trim() || posting}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Pedir ayuda
                </button>
              </div>
            </div>

            {/* Questions list */}
            {loading ? (
              <p className="text-sm text-zinc-500 text-center py-8">Cargando…</p>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HelpCircle className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">
                  {questionsFilter === "mine"
                    ? "Todavía no has pedido ayuda a la comunidad."
                    : questionsFilter === "personal"
                      ? "Nadie te ha escrito directamente todavía."
                      : "Ahora mismo nadie está pidiendo ayuda. Vuelve pronto para ayudar a alguien."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} id={`q-${q.id}`} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden scroll-mt-6">
                    {/* Question */}
                    <div className="p-5">
                      <p className="text-base text-white font-medium leading-relaxed">{q.content}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-500">
                        <span>
                          {q.answerCount === 0
                            ? "Nadie ha respondido aún"
                            : `${q.answerCount} ${q.answerCount === 1 ? "persona ha ayudado" : "personas han ayudado"}`}
                        </span>
                        <span>{timeAgo(q.createdAt)}</span>
                        {q.isForMe && <span className="text-cyan-400 font-semibold">Te lo escriben a ti</span>}
                        {q.answersFull && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            Ya ha recibido muchas ayudas
                          </span>
                        )}
                        {q.crisisDetected && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                            Derivada a atención profesional
                          </span>
                        )}
                        {q.answerCount === 0 && !q.crisisDetected && (
                          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                            Alguien espera ayuda
                          </span>
                        )}
                      </div>
                      {q.crisisDetected && (
                        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
                          Esta pregunta contiene señales de crisis. Respuestas comunitarias
                          deshabilitadas. Si estás en crisis, llama al <strong>024</strong>.
                        </div>
                      )}
                    </div>

                    {/* Answers */}
                    {q.answers.length > 0 && (
                      <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
                        {q.answers.map((a) => {
                          const isTop = q.topAnswerId === a.id && a.helpfulCount > 0;
                          return (
                            <div
                              key={a.id}
                              className={`px-5 py-3 ${
                                isTop
                                  ? "bg-emerald-500/5 border-l-2 border-emerald-500/40"
                                  : "bg-zinc-950/50"
                              }`}
                            >
                              {isTop && (
                                <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                  <CheckCircle2 className="h-3 w-3" /> Más útil
                                </div>
                              )}
                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {a.content}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                                <span>{a.author ?? "Anónimo"}</span>
                                <span>{timeAgo(a.createdAt)}</span>
                                <button
                                  onClick={() => !a.isOwn && void handleVoteHelpful(a.id)}
                                  disabled={a.isOwn}
                                  className={`inline-flex items-center gap-1 transition-colors ${
                                    a.helpfulByMe
                                      ? "text-fuchsia-400"
                                      : a.isOwn
                                        ? "text-zinc-700 cursor-not-allowed"
                                        : "hover:text-fuchsia-400"
                                  }`}
                                  title={a.isOwn ? "No puedes votar tu propia respuesta" : "Me ayudó"}
                                >
                                  <Heart
                                    className={`w-3 h-3 ${a.helpfulByMe ? "fill-fuchsia-400" : ""}`}
                                  />
                                  {a.helpfulCount > 0 && <span>{a.helpfulCount}</span>}
                                  <span className="ml-0.5">me ayudó</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Answer form */}
                    {!q.crisisDetected && !q.answersFull && (
                      <div className="border-t border-zinc-800 p-4">
                        {answeringId === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={answerText}
                              onChange={(e) => { setAnswerText(e.target.value); setGuardian(null); setGuardianBlocked(null); }}
                              placeholder="¿Qué pregunta le harías tú?"
                              rows={3}
                              maxLength={1000}
                              className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none"
                            />
                            <AnonymousHint />

                            {/* Guardian suggestion (prescriptive + reformulation) */}
                            {guardian && guardian.isPrescriptive && guardian.suggestedReformulation && (
                              <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300">
                                  Sugerencia pedagógica
                                </p>
                                <p className="text-xs text-zinc-400 italic">
                                  Parece un consejo directo. ¿Y si lo plantearas como pregunta?
                                </p>
                                <p className="text-sm text-white bg-black/40 rounded p-2 whitespace-pre-wrap">
                                  {guardian.suggestedReformulation}
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  <button
                                    onClick={() =>
                                      void submitAnswer(q.id, guardian.suggestedReformulation!)
                                    }
                                    disabled={posting}
                                    className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-40"
                                  >
                                    Publicar reformulada
                                  </button>
                                  <button
                                    onClick={() => void submitAnswer(q.id, answerText)}
                                    disabled={posting}
                                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
                                  >
                                    Publicar original
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Guardian prescriptive but no reformulation available */}
                            {guardian && guardian.isPrescriptive && !guardian.suggestedReformulation && (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                                <p className="text-xs text-amber-200">
                                  Tu mensaje suena directivo. No pudimos generar una alternativa, pero puedes publicarlo si lo crees adecuado.
                                </p>
                              </div>
                            )}

                            {/* Guardian blocked (rate limit, content blocked, network error...) */}
                            {guardianBlocked && (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                <p className="text-xs text-amber-200">{guardianBlocked}</p>
                              </div>
                            )}

                            <div className="flex gap-2 items-center">
                              {!guardian && !guardianBlocked ? (
                                <button
                                  onClick={() => void handleCheckAnswer()}
                                  disabled={!answerText.trim() || guardianLoading || posting}
                                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                                >
                                  {guardianLoading ? "Revisando..." : "Revisar y responder"}
                                </button>
                              ) : guardian && guardian.isPrescriptive && guardian.suggestedReformulation ? null : (
                                <button
                                  onClick={() => void submitAnswer(q.id, answerText)}
                                  disabled={posting || !answerText.trim()}
                                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                                >
                                  {guardianBlocked || (guardian && guardian.isPrescriptive) ? "Publicar de todas formas" : "Publicar"}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setAnsweringId(null);
                                  setAnswerText("");
                                  setGuardian(null);
                                  setGuardianBlocked(null);
                                }}
                                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <span className="ml-auto text-[10px] text-zinc-600">
                                {answerText.length}/1000
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAnsweringId(q.id);
                              setAnswerText("");
                              setGuardian(null);
                            }}
                            className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                          >
                            Ayudar
                          </button>
                        )}
                      </div>
                    )}
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
