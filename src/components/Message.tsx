"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};

export default function Message({ role, content, isError = false }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-slate-900 text-white"
            : isError
              ? "rounded-bl-md border border-red-200 bg-red-50 text-red-900"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </article>
    </div>
  );
}
