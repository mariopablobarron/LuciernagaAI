"use client";

import { useState, useEffect } from "react";

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  action: string;
  priority: string;
  createdAt: string;
}

interface Stats {
  activeUsers: number;
  newUsers: number;
  avgCheckIns: string;
  confusionCount: number;
}

export default function AdminPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateInsights = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/insights");
      const data = await response.json();

      if (data.success) {
        setInsights(data.insights || []);
        setStats(data.stats);
      } else {
        setError(data.error || "Error al generar insights");
      }
    } catch (err) {
      setError("Error conectando con el servidor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 border-red-300 text-red-900";
      case "medium":
        return "bg-yellow-100 border-yellow-300 text-yellow-900";
      default:
        return "bg-green-100 border-green-300 text-green-900";
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      retention: "📉",
      behavior: "👥",
      risk: "⚠️",
      clarity: "💡",
      engagement: "🔥",
    };
    return icons[type] || "📊";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🎯 Decision Engine
          </h1>
          <p className="text-slate-600">
            Análisis automático de datos → Insights → Acciones claras
          </p>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">
                Usuarios Activos
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.activeUsers}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">
                Usuarios Nuevos
              </p>
              <p className="text-3xl font-bold text-green-600">
                {stats.newUsers}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">
                Check-ins Promedio
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.avgCheckIns}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium mb-1">
                Confusión Detectada
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {stats.confusionCount}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={generateInsights}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
          >
            {loading ? "Analizando..." : "Generar Análisis"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-300 text-red-900 rounded-lg">
            {error}
          </div>
        )}

        {/* Insights */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            💡 Insights Automáticos
          </h2>

          {insights.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border border-slate-200 text-center">
              <p className="text-slate-600">
                Haz clic en "Generar Análisis" para obtener insights
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-6 rounded-lg border-2 ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getTypeIcon(insight.type)}
                      </span>
                      <div>
                        <h3 className="font-bold text-lg">{insight.title}</h3>
                        <p className="text-xs opacity-75">
                          {insight.type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/50 rounded-full text-xs font-semibold">
                      {insight.priority}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm opacity-90 leading-relaxed mb-3">
                      {insight.content}
                    </p>

                    <div className="bg-white/40 p-3 rounded border border-white/50">
                      <p className="text-xs font-semibold opacity-75 mb-1">
                        ✅ ACCIÓN RECOMENDADA:
                      </p>
                      <p className="text-sm font-medium">{insight.action}</p>
                    </div>
                  </div>

                  <p className="text-xs opacity-60">
                    {new Date(insight.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
