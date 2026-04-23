"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Check, CheckCheck } from "lucide-react";

type AdminMessage = {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

export default function UserAdminMessagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/me/admin-messages/${params.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { message: AdminMessage };
        if (!cancelled) setData(json.message);

        // Marca leído (idempotente). No bloqueamos la vista.
        void fetch(`/api/me/admin-messages/${params.id}`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const paragraphs = useMemo(
    () => (data?.body ?? "").split(/\n{2,}/).filter(Boolean),
    [data?.body],
  );

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-violet-300">
            <Mail className="h-3.5 w-3.5" />
            <span>Mensaje del equipo · Tres Mil Millones de Latidos</span>
          </div>

          {error && (
            <p className="mt-6 text-sm text-red-400">No se pudo cargar el mensaje ({error}).</p>
          )}

          {!error && !data && <p className="mt-6 text-sm text-zinc-500">Cargando…</p>}

          {data && (
            <>
              <h1 className="mt-3 text-2xl font-semibold text-white">{data.subject}</h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>{new Date(data.sentAt).toLocaleString()}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {data.readAt ? (
                    <>
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> Leído
                    </>
                  ) : data.deliveredAt ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-zinc-400" /> Entregado
                    </>
                  ) : (
                    <span className="text-zinc-600">Enviando…</span>
                  )}
                </span>
              </div>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-200">
                {paragraphs.map((p, idx) => (
                  <p key={idx} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  <MessageCircle className="h-4 w-4" /> Ir al chat con el mentor
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
