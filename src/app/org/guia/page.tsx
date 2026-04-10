"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Download, LogOut, ShieldCheck, Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Lightweight markdown → JSX renderer                                */
/* ------------------------------------------------------------------ */

function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let pKey = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    type Match = { type: string; index: number; match: RegExpMatchArray };
    const matches: Match[] = [];
    if (boldMatch?.index != null) matches.push({ type: "bold", index: boldMatch.index, match: boldMatch });
    if (codeMatch?.index != null) matches.push({ type: "code", index: codeMatch.index, match: codeMatch });

    if (matches.length === 0) { parts.push(remaining); break; }

    matches.sort((a, b) => a.index - b.index);
    const first = matches[0];
    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    if (first.type === "bold") {
      parts.push(<strong key={pKey++} className="text-white font-semibold">{first.match[1]}</strong>);
    } else {
      parts.push(<code key={pKey++} className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-violet-300 font-mono">{first.match[1]}</code>);
    }
    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") { i++; continue; }
    if (/^-{3,}$/.test(trimmed)) { elements.push(<hr key={key++} className="border-zinc-800 my-6" />); i++; continue; }

    // Headers
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      elements.push(<h1 key={key++} className="text-2xl font-bold text-white mt-10 mb-4">{inlineFormat(trimmed.slice(2))}</h1>);
      i++; continue;
    }
    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      elements.push(<h2 key={key++} className="text-xl font-bold text-white mt-8 mb-3 pb-2 border-b border-violet-500/30">{inlineFormat(trimmed.slice(3))}</h2>);
      i++; continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-lg font-semibold text-violet-300 mt-6 mb-2">{inlineFormat(trimmed.slice(4))}</h3>);
      i++; continue;
    }

    // Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^[-:]+$/.test(c))) tableRows.push(cells);
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
                    <th key={j} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">{inlineFormat(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {body.map((row, ri) => (
                  <tr key={ri} className="hover:bg-zinc-800/20 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-2 text-xs ${ci === 0 ? "font-medium text-zinc-200" : "text-zinc-400"}`}>{inlineFormat(cell)}</td>
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

    // List
    if (/^\s*[-*]\s+/.test(lines[i])) {
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
    if (/^\s*\d+\.\s+/.test(lines[i])) {
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
    if (trimmed) {
      elements.push(<p key={key++} className="text-sm text-zinc-400 leading-relaxed my-1.5">{inlineFormat(trimmed)}</p>);
    }
    i++;
  }

  return elements;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OrgGuiaPage() {
  const router = useRouter();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoc = useCallback(async () => {
    const token = sessionStorage.getItem("org_token");
    if (!token) { router.push("/org/login"); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/docs?token=${token}&format=md`);
      if (res.status === 401) { router.push("/org/login"); return; }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setContent(await res.text());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar la guia");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadDoc(); }, [loadDoc]);

  function handleDownloadPdf() {
    const token = sessionStorage.getItem("org_token");
    if (token) window.open(`/api/org/docs?token=${token}&format=html`, "_blank");
  }

  function handleLogout() {
    sessionStorage.clear();
    router.push("/org/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-bold">Guia del portal organizacional</h1>
            <p className="text-xs text-zinc-500">Para psicologos, terapeutas y responsables de HR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-300 font-medium">Datos protegidos</span>
          </div>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-xs font-semibold text-white hover:bg-violet-400 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            <span className="ml-3 text-sm text-zinc-500">Cargando guia...</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-sm text-red-400">Error: {error}</div>
        )}

        {!loading && !error && content && (
          <div>{renderMarkdown(content)}</div>
        )}

        {/* Footer note */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-zinc-600">
            Tres Mil Millones de Latidos — Herramienta de apoyo y deteccion temprana. No sustituye atencion profesional.
          </p>
        </div>
      </div>
    </div>
  );
}
