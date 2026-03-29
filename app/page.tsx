"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const sendMessage = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    setResponse(data.reply);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Luciernaga AI 🚀</h1>

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
