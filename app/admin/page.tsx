"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-6">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">

      <h1 className="text-2xl font-bold">🧠 Luciérnaga Admin - Decision Engine</h1>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Usuarios Totales</p>
          <h2 className="text-2xl font-bold">{data.stats.totalUsers}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Activos (7d)</p>
          <h2 className="text-2xl font-bold">{data.stats.activeUsers}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Retención D3</p>
          <h2 className="text-2xl font-bold text-green-600">{data.stats.retentionDay3}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Punto Abandono</p>
          <h2 className="text-xl font-bold text-red-600">{data.stats.dropOffPoint}</h2>
        </div>
      </div>

      {/* Métricas Clave */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm font-medium text-blue-800">Retención D7</p>
          <p className="text-2xl font-bold text-blue-600">{data.stats.retentionDay7}</p>
        </div>

        <div className="p-4 bg-orange-50 rounded border border-orange-200">
          <p className="text-sm font-medium text-orange-800">Check-in Drop</p>
          <p className="text-2xl font-bold text-orange-600">{data.stats.checkinDrop}</p>
        </div>

        <div className="p-4 bg-purple-50 rounded border border-purple-200">
          <p className="text-sm font-medium text-purple-800">Estado Dominante</p>
          <p className="text-xl font-bold text-purple-600">{data.stats.dominantState}</p>
        </div>
      </div>

      {/* Motor de Decisiones */}
      <div className="p-6 bg-white rounded border-l-4 border-red-500 shadow">
        <h2 className="text-lg font-bold mb-2">🎯 Decisión Generada Automáticamente</h2>
        <p className="text-lg font-semibold text-red-600 mb-2">{data.decision.decision}</p>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Métrica: {data.decision.metric}</span>
          <span className={`px-3 py-1 rounded text-sm font-bold ${
            data.decision.priority === "high" ? "bg-red-200 text-red-800" :
            data.decision.priority === "medium" ? "bg-yellow-200 text-yellow-800" :
            "bg-green-200 text-green-800"
          }`}>
            {data.decision.priority.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h2 className="text-lg font-bold mb-3">📊 Insights Analíticos</h2>
        <div className="space-y-3">
          {data.insights.map((i: any, idx: number) => (
            <div key={idx} className="p-4 bg-white rounded shadow border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-900">{i.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{i.content}</p>
              <p className="mt-2 text-blue-600 font-medium">👉 {i.action}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
