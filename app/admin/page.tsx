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

      <h1 className="text-2xl font-bold">🧠 Luciérnaga Admin v1</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p>Usuarios</p>
          <h2 className="text-xl font-bold">{data.stats.users}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p>Check-ins</p>
          <h2 className="text-xl font-bold">{data.stats.totalLogs}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p>Mensajes de confusión</p>
          <h2 className="text-xl font-bold">{data.stats.confusionMessages}</h2>
        </div>
      </div>

      <div>
        <h2 className="text-xl mb-3">📊 Insights automáticos</h2>

        <div className="space-y-3">
          {data.insights.map((i: any) => (
            <div key={i.id} className="p-4 bg-white rounded shadow">
              <h3 className="font-bold">{i.title}</h3>
              <p className="text-gray-600 text-sm">{i.content}</p>
              <p className="mt-2 text-blue-600 font-medium">
                👉 {i.action}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
