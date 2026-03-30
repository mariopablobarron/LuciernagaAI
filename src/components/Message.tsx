"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  variant?: "action_required" | "crisis";
  meta?: {
    searchUsed?: boolean;
    fallback?: boolean;
  };
};

export default function Message({ role, content, isError = false, variant, meta }: MessageProps) {
  const isUser = role === "user";
  const isActionRequired = variant === "action_required";
  const isCrisis = variant === "crisis";
  const showMeta = !isUser && (meta?.searchUsed || meta?.fallback);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-slate-900 text-white"
            : isError
              ? "rounded-bl-md border border-red-200 bg-red-50 text-red-900"
              : isCrisis
                ? "rounded-bl-md border border-rose-300 bg-rose-50 text-rose-950"
                : isActionRequired
                  ? "rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {isCrisis ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
            Crisis
          </p>
        ) : null}
        {isActionRequired ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Acción requerida
          </p>
        ) : null}
        {showMeta ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {meta?.searchUsed ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                Internet usado
              </span>
            ) : null}
            {meta?.fallback ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Fallback IA
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{content}</p>
      </article>
    </div>
  );
}
