"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const sendMessage = async () => {
    console.log("📡 Enviando a /api/chat...");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    console.log("🧠 RESPUESTA REAL:", data);

    setResponse(data.reply);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>🔥 VERSION REAL IA</h1>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe aquí..."
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />

      <button onClick={sendMessage}>Enviar</button>

      <p style={{ marginTop: 20 }}>
        <strong>Respuesta:</strong> {response}
      </p>
    </main>
  );
}
