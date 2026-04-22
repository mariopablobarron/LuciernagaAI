"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DailyBucket = {
  date: string;
  totalMs: number;
  chatMs: number;
  appMs: number;
  sessionsCount: number;
};

type UsageResponse = {
  days: number;
  totals: {
    totalMs: number;
    chatMs: number;
    appMs: number;
    sessionsCount: number;
    activeDays: number;
    avgSessionMs: number;
  };
  daily: DailyBucket[];
};

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "0 s";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

type Props = { userId: string };

type Fetched = { userId: string; days: number; payload: UsageResponse };

export default function UserUsageSection({ userId }: Props) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 30>(30);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/admin/users/${userId}/usage?days=${days}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as UsageResponse;
      })
      .then((payload) => {
        if (!cancelled) setFetched({ userId, days, payload });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, days]);

  const isCurrent = fetched?.userId === userId && fetched?.days === days;
  const loading = !isCurrent && !error;
  const data = isCurrent ? fetched?.payload ?? null : null;

  const maxMs = useMemo(() => {
    if (!data?.daily?.length) return 0;
    return data.daily.reduce((max, d) => (d.totalMs > max ? d.totalMs : max), 0);
  }, [data]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tiempo de uso</CardTitle>
            <CardDescription>Sesiones reales medidas por heartbeat (30 s).</CardDescription>
          </div>
          <div className="flex gap-1 text-xs">
            {[7, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setError(null);
                  setDays(n as 7 | 30);
                }}
                className={`rounded-md border px-2 py-1 ${
                  days === n
                    ? "border-violet-500 bg-violet-500/10 text-violet-200"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {n} d
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && <p className="text-zinc-500">Cargando uso…</p>}
        {error && <p className="text-red-400">No se pudo cargar: {error}</p>}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiBox label="Tiempo total" value={formatDuration(data.totals.totalMs)} />
              <KpiBox label="Sesiones" value={String(data.totals.sessionsCount)} />
              <KpiBox label="Sesión media" value={formatDuration(data.totals.avgSessionMs)} />
              <KpiBox label="Días activos" value={`${data.totals.activeDays} / ${data.days}`} />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-violet-500" /> chat
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-zinc-500" /> resto
              </span>
              <span className="ml-auto">{formatDuration(data.totals.chatMs)} chat · {formatDuration(data.totals.appMs)} resto</span>
            </div>

            <div className="flex h-24 items-end gap-[2px] overflow-hidden rounded-md bg-zinc-950/60 p-2">
              {data.daily.map((d) => {
                const total = maxMs > 0 ? (d.totalMs / maxMs) * 100 : 0;
                const chat = d.totalMs > 0 ? (d.chatMs / d.totalMs) * 100 : 0;
                return (
                  <div
                    key={d.date}
                    className="group relative flex flex-1 flex-col justify-end"
                    title={`${formatShortDate(d.date)} · ${formatDuration(d.totalMs)} (${d.sessionsCount} sesiones)`}
                  >
                    <div
                      className="w-full rounded-sm bg-zinc-500/80"
                      style={{ height: `${total}%` }}
                    >
                      <div
                        className="w-full rounded-sm bg-violet-500"
                        style={{ height: `${chat}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>{data.daily[0] ? formatShortDate(data.daily[0].date) : ""}</span>
              <span>{data.daily.length > 0 ? formatShortDate(data.daily[data.daily.length - 1].date) : ""}</span>
            </div>

            {data.totals.totalMs === 0 && (
              <Badge variant="secondary" className="text-xs">
                Sin datos todavía — el tracker empieza a medir tras el próximo redeploy.
              </Badge>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
