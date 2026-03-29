"use client";

import { useState, useRef, useEffect } from "react";

const VERSION = "v3";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("VERSION ACTUAL:", VERSION);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "No pude obtener una respuesta.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Error al conectar con el servidor.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-blue-900">🧠 Mentor IA {VERSION}</h1>
          <p className="text-sm text-blue-600 mt-1">Verdad sin filtros, dirección clara</p>
        </div>
      </header>

      {/* Messages Container */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">
                Bienvenido al Mentor IA
              </h2>
              <p className="text-blue-600 max-w-md">
                Cuéntame qué te pasa y te diré la verdad, sin rodeos ni listas de consejos.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-lg"
                      : "bg-white text-blue-900 border border-blue-100 rounded-bl-none shadow-md"
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-blue-900 border border-blue-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✨</span>
                  <p className="text-sm">Pensando…</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-blue-100 bg-white/80 backdrop-blur-md py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Dime qué te preocupa o qué necesitas entender..."
              disabled={loading}
              rows={3}
              className="flex-1 p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-blue-50 text-blue-900 placeholder-blue-400 disabled:opacity-50 disabled:bg-gray-100"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center whitespace-nowrap h-fit mt-auto shadow-lg hover:shadow-xl"
            >
              {loading ? "..." : "Enviar"}
            </button>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Shift+Enter para nueva línea, Enter para enviar
          </p>
        </div>
      </footer>
    </div>
  );
}
