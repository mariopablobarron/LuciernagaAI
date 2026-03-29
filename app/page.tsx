"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");

  const sendMessage = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    setResponse(data.reply);
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Luciernaga AI 🚀</h1>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe algo..."
      />

      <button onClick={sendMessage}>
        Enviar
      </button>

      <p><strong>Respuesta:</strong> {response}</p>
    </main>
  );
}
