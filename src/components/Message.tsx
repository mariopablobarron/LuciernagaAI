"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  variant?: "action_required";
};

export default function Message({
  role,
  content,
  isError = false,
  variant,
}: MessageProps) {
  const isUser = role === "user";
  const isActionRequired = variant === "action_required";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-slate-900 text-white"
            : isError
              ? "rounded-bl-md border border-red-200 bg-red-50 text-red-900"
              : isActionRequired
                ? "rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {isActionRequired ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Acción requerida
          </p>
        ) : null}
        <p className="whitespace-pre-wrap">{content}</p>
      </article>
    </div>
  );
}
