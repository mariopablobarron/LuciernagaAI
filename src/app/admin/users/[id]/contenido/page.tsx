"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Filter,
  Search,
  FileText,
  MessageSquareText,
  BookOpen,
  HelpCircle,
  MessagesSquare,
  ClipboardList,
  Trophy,
  FileSpreadsheet,
  Bot,
  ExternalLink,
} from "lucide-react";

type ContentType =
  | "message"
  | "post"
  | "anon_question"
  | "anon_answer"
  | "diary"
  | "checkin"
  | "win"
  | "feedback";

type ContentItem = {
  id: string;
  type: ContentType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  linkPath: string | null;
};

const TYPES: {
  key: ContentType;
  label: string;
  icon: typeof FileText;
  color: string;
}[] = [
  { key: "message",       label: "Mensajes",     icon: MessageSquareText, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { key: "post",          label: "Comunidad",    icon: MessagesSquare,    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { key: "anon_question", label: "Preguntas",    icon: HelpCircle,        color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  { key: "anon_answer",   label: "Respuestas",   icon: MessagesSquare,    color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30" },
  { key: "diary",         label: "Diario",       icon: BookOpen,          color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { key: "checkin",       label: "Check-ins",    icon: ClipboardList,     color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  { key: "win",           label: "Victorias",    icon: Trophy,            color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { key: "feedback",      label: "Feedback",     icon: FileText,          color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
];

function typeMeta(t: ContentType) {
  return TYPES.find((x) => x.key === t) ?? TYPES[0];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function MetadataPills({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[10px] text-zinc-400"
          title={`${k}: ${String(v)}`}
        >
          <span className="text-zinc-600">{k}</span>
          <span className="text-zinc-300">{typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v)}</span>
        </span>
      ))}
    </div>
  );
}

export default function UserContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<Set<ContentType>>(new Set());
  const [includeAssistant, setIncludeAssistant] = useState(false);
  const [search, setSearch] = useState("");
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string } | null>(null);

  const checkAuth = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        router.replace(`/admin/login?next=/admin/users/${id}/contenido`);
        return false;
      }
      if (res.status === 403) {
        toast.error("No tienes permiso para ver este contenido.");
        router.replace(`/admin/users/${id}`);
        return false;
      }
      return true;
    },
    [router, id],
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTypes.size > 0) {
        params.set("types", Array.from(selectedTypes).join(","));
      }
      if (includeAssistant) params.set("includeAssistant", "true");
      params.set("limit", "1000");
      const res = await fetch(`/api/admin/users/${id}/content?${params.toString()}`, {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        toast.error("Error al cargar el contenido");
        return;
      }
      const data = (await res.json()) as { items: ContentItem[] };
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [id, selectedTypes, includeAssistant, checkAuth]);

  const fetchUserInfo = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`, { credentials: "include" });
    if (!checkAuth(res)) return;
    if (!res.ok) return;
    const data = (await res.json()) as { user: { name: string | null; email: string } };
    setUserInfo(data.user);
  }, [id, checkAuth]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);
  useEffect(() => { void fetchUserInfo(); }, [fetchUserInfo]);

  function toggleType(t: ContentType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function clearFilters() {
    setSelectedTypes(new Set());
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((i) => i.content.toLowerCase().includes(q));
  }, [items, search]);

  const countsByType = useMemo(() => {
    const map = new Map<ContentType, number>();
    for (const i of items) map.set(i.type, (map.get(i.type) ?? 0) + 1);
    return map;
  }, [items]);

  function exportUrl(format: "csv" | "txt"): string {
    const params = new URLSearchParams({ format });
    if (selectedTypes.size > 0) params.set("types", Array.from(selectedTypes).join(","));
    if (includeAssistant) params.set("includeAssistant", "true");
    return `/api/admin/users/${id}/content/export?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/users/${id}`}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="Volver a la ficha"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white truncate">
              Contenido · {userInfo?.name ?? userInfo?.email ?? "cargando..."}
            </h1>
            <p className="text-xs text-zinc-500">
              Todo lo que ha escrito este usuario, ordenado de lo más reciente.
            </p>
          </div>
          <a
            href={exportUrl("csv")}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            CSV
          </a>
          <a
            href={exportUrl("txt")}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            TXT
          </a>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar texto en todo lo escrito..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <button
            type="button"
            onClick={clearFilters}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
              selectedTypes.size === 0
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todo ({items.length})
          </button>
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = selectedTypes.has(t.key);
            const count = countsByType.get(t.key) ?? 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleType(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  active
                    ? t.color
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
                {count > 0 && <span className="text-zinc-500">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Assistant toggle */}
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeAssistant}
            onChange={(e) => setIncludeAssistant(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900"
          />
          <Bot className="h-3.5 w-3.5" />
          Incluir también mensajes del asistente (por defecto solo lo que escribió la persona)
        </label>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">
              {search.trim()
                ? "Nada coincide con tu búsqueda."
                : "Este usuario no ha escrito nada del tipo seleccionado."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              Mostrando {filtered.length} {filtered.length === 1 ? "entrada" : "entradas"}
              {search.trim() && ` de ${items.length} totales`}
            </p>
            <div className="space-y-3">
              {filtered.map((item) => {
                const meta = typeMeta(item.type);
                const Icon = meta.icon;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-zinc-500">{formatDate(item.createdAt)}</span>
                      {item.linkPath && (
                        <Link
                          href={item.linkPath}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                        >
                          Abrir en contexto <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                      {item.content}
                    </div>
                    <MetadataPills metadata={item.metadata} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
