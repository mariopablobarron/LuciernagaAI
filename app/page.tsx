"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;

    setLoading(true);
    setResponse("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    setResponse(data.reply);
    setLoading(false);
  };

  return (
    <main style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🧠 Mentor IA v2</h1>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Cuéntame qué te pasa..."
        style={{
          width: "100%",
          padding: 10,
          minHeight: 100,
          marginBottom: 10,
        }}
      />

      <button onClick={sendMessage} disabled={loading}>
        {loading ? "Pensando..." : "Hablar"}
      </button>

      <div style={{ marginTop: 20 }}>
        <strong>Respuesta:</strong>
        <p>{response}</p>
      </div>
    </main>
  );
}
