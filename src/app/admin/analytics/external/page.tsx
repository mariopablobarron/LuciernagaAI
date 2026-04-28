"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Globe,
  RefreshCw,
  Search,
  Settings,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";

type ProviderStatus<T> = { configured: boolean; data: T };

type GA4Data = {
  ok: boolean;
  range?: { startDate: string; endDate: string };
  totals?: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDurationSeconds: number;
    bounceRate: number;
    conversions: number;
  };
  topSources?: Array<{ source: string; users: number; sessions: number }>;
  topPages?: Array<{ path: string; views: number; avgDurationSec: number }>;
  byDay?: Array<{ date: string; activeUsers: number; sessions: number }>;
  error?: string;
  reason?: string;
  missing?: string[];
};

type GSCData = {
  ok: boolean;
  site?: string;
  range?: { startDate: string; endDate: string };
  totals?: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries?: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages?: Array<{ page: string; clicks: number; impressions: number }>;
  error?: string;
  reason?: string;
  missing?: string[];
};

type MetricoolData = {
  ok: boolean;
  range?: { startDate: string; endDate: string };
  networks?: Array<{
    network: string;
    followers: number;
    engagement: number;
    posts: number;
    impressions: number;
  }>;
  error?: string;
  reason?: string;
  missing?: string[];
};

type ExternalData = {
  ok: boolean;
  generatedAt: string;
  rangeDays: number;
  providers: {
    ga4: ProviderStatus<GA4Data>;
    searchConsole: ProviderStatus<GSCData>;
    metricool: ProviderStatus<MetricoolData>;
  };
};

type IconType = typeof Globe;
function ProviderHeader({
  title,
  icon: Icon,
  configured,
  range,
}: {
  title: string;
  icon: IconType;
  configured: boolean;
  range?: { startDate: string; endDate: string };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {!configured ? (
          <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            no configurado
          </span>
        ) : null}
      </div>
      {range ? (
        <span className="text-[10px] text-zinc-500">
          {range.startDate} → {range.endDate}
        </span>
      ) : null}
    </div>
  );
}

function NotConfiguredCard({ missing }: { missing?: string[] }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
        <div className="text-xs text-amber-200">
          <p className="font-semibold mb-1">Faltan variables de entorno</p>
          {missing && missing.length > 0 ? (
            <ul className="list-disc list-inside space-y-0.5 text-amber-300/80">
              {missing.map((m) => (
                <li key={m} className="font-mono">
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-amber-300/70">
            Sigue las instrucciones en <span className="font-mono">docs/setup-analytics-external.md</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ error }: { error?: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
        <div className="text-xs text-red-200">
          <p className="font-semibold mb-1">Error consultando el proveedor</p>
          <p className="font-mono break-all">{error ?? "unknown"}</p>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-[10px] font-semibold uppercase text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      {hint ? <p className="text-[10px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString();
}
function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
function fmtSec(n: number): string {
  if (n < 60) return `${n.toFixed(1)}s`;
  return `${Math.floor(n / 60)}m ${Math.round(n % 60)}s`;
}

export default function AnalyticsExternalPage() {
  const router = useRouter();
  const [data, setData] = useState<ExternalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 28>(7);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics-external?range=${range}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("No se pudo cargar el dashboard externo");
        return;
      }
      const json = (await res.json()) as ExternalData;
      setData(json);
    } catch (err) {
      toast.error("Error de red al cargar analytics externos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const ga4 = data?.providers.ga4;
  const gsc = data?.providers.searchConsole;
  const metricool = data?.providers.metricool;

  return (
    <AdminShell
      title="Analytics externos"
      subtitle="Web (GA4 + Search Console) + redes sociales (Metricool)."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Analytics externos</h1>
            <p className="text-xs text-zinc-500">
              Web (GA4 + Search Console) + redes sociales (Metricool). Datos en vivo, sin cache.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
              <button
                onClick={() => setRange(7)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  range === 7 ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:text-white"
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setRange(28)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  range === 28 ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:text-white"
                }`}
              >
                28 días
              </button>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <Link
              href="/admin/analytics"
              className="text-xs text-zinc-500 underline hover:text-white"
            >
              ← Producto
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Cargando…</div>
        ) : null}

        {data ? (
          <>
            {/* GA4 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <ProviderHeader
                title="Google Analytics 4 — Tráfico web"
                icon={Globe}
                configured={ga4?.configured ?? false}
                range={ga4?.data.range}
              />
              {!ga4?.configured ? (
                <NotConfiguredCard missing={ga4?.data.missing} />
              ) : !ga4.data.ok ? (
                <ErrorCard error={ga4.data.error} />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    <StatBlock label="Usuarios" value={fmt(ga4.data.totals?.activeUsers ?? 0)} />
                    <StatBlock label="Sesiones" value={fmt(ga4.data.totals?.sessions ?? 0)} />
                    <StatBlock label="Páginas vistas" value={fmt(ga4.data.totals?.screenPageViews ?? 0)} />
                    <StatBlock
                      label="Duración media"
                      value={fmtSec(ga4.data.totals?.averageSessionDurationSeconds ?? 0)}
                    />
                    <StatBlock label="Rebote" value={fmtPct(ga4.data.totals?.bounceRate ?? 0)} />
                    <StatBlock label="Conversiones" value={fmt(ga4.data.totals?.conversions ?? 0)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top fuentes</p>
                      <ul className="space-y-1">
                        {(ga4.data.topSources ?? []).slice(0, 8).map((s, i) => (
                          <li key={i} className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="truncate font-mono">{s.source || "(direct)"}</span>
                            <span className="text-zinc-500">{fmt(s.users)} usr</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top páginas</p>
                      <ul className="space-y-1">
                        {(ga4.data.topPages ?? []).slice(0, 8).map((p, i) => (
                          <li key={i} className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="truncate font-mono">{p.path}</span>
                            <span className="text-zinc-500">{fmt(p.views)} v</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Search Console */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <ProviderHeader
                title="Google Search Console — SEO"
                icon={Search}
                configured={gsc?.configured ?? false}
                range={gsc?.data.range}
              />
              {!gsc?.configured ? (
                <NotConfiguredCard missing={gsc?.data.missing} />
              ) : !gsc.data.ok ? (
                <ErrorCard error={gsc.data.error} />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBlock label="Clicks" value={fmt(gsc.data.totals?.clicks ?? 0)} />
                    <StatBlock label="Impresiones" value={fmt(gsc.data.totals?.impressions ?? 0)} />
                    <StatBlock label="CTR" value={fmtPct(gsc.data.totals?.ctr ?? 0, 2)} />
                    <StatBlock
                      label="Posición media"
                      value={(gsc.data.totals?.position ?? 0).toFixed(1)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top queries</p>
                      <ul className="space-y-1">
                        {(gsc.data.topQueries ?? []).slice(0, 8).map((q, i) => (
                          <li key={i} className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="truncate">{q.query}</span>
                            <span className="text-zinc-500">{fmt(q.clicks)} clk</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top páginas</p>
                      <ul className="space-y-1">
                        {(gsc.data.topPages ?? []).slice(0, 8).map((p, i) => (
                          <li key={i} className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="truncate font-mono">
                              {p.page.replace(/^https?:\/\/[^/]+/, "")}
                            </span>
                            <span className="text-zinc-500">{fmt(p.clicks)} clk</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Metricool */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <ProviderHeader
                title="Metricool — Redes sociales"
                icon={Share2}
                configured={metricool?.configured ?? false}
                range={metricool?.data.range}
              />
              {!metricool?.configured ? (
                <NotConfiguredCard missing={metricool?.data.missing} />
              ) : !metricool.data.ok ? (
                <ErrorCard error={metricool.data.error} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(metricool.data.networks ?? []).map((n) => (
                    <div key={n.network} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-xs font-semibold text-white mb-2 capitalize">{n.network}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-zinc-500">Seguidores</p>
                          <p className="text-white font-semibold">{fmt(n.followers)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Engagement</p>
                          <p className="text-white font-semibold">{fmt(n.engagement)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Posts</p>
                          <p className="text-white font-semibold">{fmt(n.posts)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Impresiones</p>
                          <p className="text-white font-semibold">{fmt(n.impressions)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
              <p>
                <Settings className="inline h-3 w-3 mr-1" />
                Generado a las {new Date(data.generatedAt).toLocaleString("es-ES")}. Configuración:{" "}
                <Link href="/docs/setup-analytics-external" className="underline">
                  guía paso a paso
                </Link>
              </p>
            </div>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
