"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Download, Users, Building2, ShieldCheck,
  Stethoscope, ChevronRight, FileText, Loader2, ExternalLink,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type DocId = "guia" | "usuario" | "organizaciones" | "admin";

type DocMeta = {
  id: DocId;
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  color: string;
  bg: string;
  border: string;
  audience: string;
};

const DOCS: DocMeta[] = [
  {
    id: "guia",
    title: "Guia de Luciernaga",
    subtitle: "Vision general, argumentario, fundador, principios pedagogicos y guia completa por rol",
    icon: BookOpen,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    audience: "Todos los roles",
  },
  {
    id: "usuario",
    title: "Manual de usuario",
    subtitle: "Como usar la plataforma dia a dia: chat, metas, diario, check-ins, Modo Impulso, Telegram",
    icon: Users,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    audience: "Usuarios finales",
  },
  {
    id: "organizaciones",
    title: "Manual de organizaciones",
    subtitle: "Portal B2B para HR y terapeutas: dashboard, pacientes, estados emocionales, crisis",
    icon: Building2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    audience: "HR y terapeutas de organizaciones",
  },
  {
    id: "admin",
    title: "Manual de administracion",
    subtitle: "Panel admin, RBAC, clinico, marketing, Telegram, Stripe, cron jobs, endpoints",
    icon: ShieldCheck,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    audience: "Equipo tecnico y operativo",
  },
];

/* ------------------------------------------------------------------ */
/*  Lightweight markdown → JSX renderer                                */
/* ------------------------------------------------------------------ */

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  function inlineFormat(text: string): React.ReactNode {
    // Split on bold, italic, code, links
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let pKey = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Link
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

      // Find earliest match
      type Match = { type: string; index: number; match: RegExpMatchArray };
      const matches: Match[] = [];
      if (boldMatch?.index != null) matches.push({ type: "bold", index: boldMatch.index, match: boldMatch });
      if (codeMatch?.index != null) matches.push({ type: "code", index: codeMatch.index, match: codeMatch });
      if (linkMatch?.index != null) matches.push({ type: "link", index: linkMatch.index, match: linkMatch });

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      matches.sort((a, b) => a.index - b.index);
      const first = matches[0];

      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      if (first.type === "bold") {
        parts.push(<strong key={pKey++} className="text-white font-semibold">{first.match[1]}</strong>);
        remaining = remaining.slice(first.index + first.match[0].length);
      } else if (first.type === "code") {
        parts.push(
          <code key={pKey++} className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-violet-300 font-mono">
            {first.match[1]}
          </code>
        );
        remaining = remaining.slice(first.index + first.match[0].length);
      } else if (first.type === "link") {
        parts.push(
          <span key={pKey++} className="text-violet-400 underline underline-offset-2">
            {first.match[1]}
          </span>
        );
        remaining = remaining.slice(first.index + first.match[0].length);
      }
    }

    return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") { i++; continue; }

    // Horizontal rules
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={key++} className="border-zinc-800 my-6" />);
      i++;
      continue;
    }

    // Code blocks
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-x-auto text-xs text-zinc-300 font-mono my-3">
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-white mt-10 mb-4">
          {inlineFormat(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-white mt-8 mb-3 pb-2 border-b border-violet-500/30">
          {inlineFormat(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("### ") && !trimmed.startsWith("#### ")) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-violet-300 mt-6 mb-2">
          {inlineFormat(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-zinc-200 mt-4 mb-1">
          {inlineFormat(trimmed.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-3 border-violet-500 bg-violet-500/5 rounded-r-lg px-4 py-3 my-3 text-sm text-violet-200 italic">
          {quoteLines.map((l, j) => <p key={j}>{inlineFormat(l)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        // Skip separator row
        if (!cells.every((c) => /^[-:]+$/.test(c))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const body = tableRows.slice(1);
        elements.push(
          <div key={key++} className="overflow-x-auto my-3 rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/80">
                  {headers.map((h, j) => (
                    <th key={j} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      {inlineFormat(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {body.map((row, ri) => (
                  <tr key={ri} className="hover:bg-zinc-800/20 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-2 text-xs ${ci === 0 ? "font-medium text-zinc-200" : "text-zinc-400"}`}>
                        {inlineFormat(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-1 my-2 ml-4">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0 mt-2" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="space-y-1 my-2 ml-4">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">{j + 1}</span>
              </span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} className="text-sm text-zinc-400 leading-relaxed my-1.5">
        {inlineFormat(trimmed)}
      </p>
    );
    i++;
  }

  return elements;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminGuiaPage() {
  const router = useRouter();
  const [activeDoc, setActiveDoc] = useState<DocId>("guia");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDoc = useCallback(async (docId: DocId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/docs?doc=${docId}&format=md`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const text = await res.text();
      setContent(text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar el documento");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDoc(activeDoc);
  }, [activeDoc, loadDoc]);

  function handleDownloadPdf(docId: DocId) {
    window.open(`/api/admin/docs?doc=${docId}&format=html`, "_blank");
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const activeMeta = DOCS.find((d) => d.id === activeDoc)!;

  return (
    <AdminShell
      title="Documentacion"
      subtitle="Guias y manuales de la plataforma — consultables y descargables en PDF"
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Document selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          const isActive = doc.id === activeDoc;
          return (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              className={`text-left rounded-xl border p-4 transition-all ${
                isActive
                  ? `${doc.border} ${doc.bg} ring-1 ring-violet-500/30`
                  : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${doc.bg} border ${doc.border} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${doc.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-zinc-300"}`}>
                    {doc.title}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{doc.audience}</p>
            </button>
          );
        })}
      </div>

      {/* Active document header */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-xl ${activeMeta.bg} border ${activeMeta.border} flex items-center justify-center shrink-0`}>
            <activeMeta.icon className={`w-6 h-6 ${activeMeta.color}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{activeMeta.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">{activeMeta.subtitle}</p>
            <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" />
              Audiencia: {activeMeta.audience}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleDownloadPdf(activeDoc)}
            className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Quick download all */}
      <div className="flex flex-wrap gap-2">
        {DOCS.map((doc) => (
          <button
            key={doc.id}
            onClick={() => handleDownloadPdf(doc.id)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[10px] font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
          >
            <FileText className="w-3 h-3" />
            {doc.title}
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        ))}
      </div>

      {/* Document content */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            <span className="ml-3 text-sm text-zinc-500">Cargando documento...</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-sm text-red-400">
            Error: {error}
          </div>
        )}

        {!loading && !error && content && (
          <div className="px-6 py-8 md:px-10 md:py-10 max-w-4xl mx-auto">
            {renderMarkdown(content)}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
