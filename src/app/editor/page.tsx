"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const BlockEditor = dynamic(() => import("@/components/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[520px] animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm" />
  ),
});

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-6xl flex-col gap-4 lg:h-[calc(100vh-3rem)]">
        <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Editor de Bloques</h1>
              <p className="text-sm text-slate-500">
                Estilo Notion con drag and drop nativo de BlockNote.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Volver al Chat
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <BlockEditor />
        </div>
      </div>
    </main>
  );
}
