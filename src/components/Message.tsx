"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  streaming?: boolean;
  variant?: "action_required" | "crisis";
  meta?: {
    searchUsed?: boolean;
    fallback?: boolean;
  };
};

export default function Message({ role, content, isError = false, streaming = false, variant, meta }: MessageProps) {
  const isUser = role === "user";
  const isActionRequired = variant === "action_required";
  const isCrisis = variant === "crisis";
  const showMeta = !isUser && (meta?.searchUsed || meta?.fallback);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md border border-primary/20 bg-primary text-primary-foreground"
            : isError
              ? "rounded-bl-md border border-signal-danger/30 bg-signal-danger/12 text-foreground"
              : isCrisis
                ? "rounded-bl-md border border-signal-danger/30 bg-signal-danger/12 text-foreground"
                : isActionRequired
                  ? "rounded-bl-md border border-signal-warning/30 bg-signal-warning/12 text-foreground"
                  : "rounded-bl-md border border-border bg-card text-card-foreground"
        }`}
      >
        {isCrisis ? (
          <p className="mb-2 inline-flex rounded-full border border-signal-danger/30 bg-signal-danger/14 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Crisis
          </p>
        ) : null}
        {isActionRequired ? (
          <p className="mb-2 inline-flex rounded-full border border-signal-warning/30 bg-signal-warning/14 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Acción requerida
          </p>
        ) : null}
        {showMeta ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {meta?.searchUsed ? (
              <span className="rounded-full border border-emotion-doubt/30 bg-emotion-doubt/14 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                Internet usado
              </span>
            ) : null}
            {meta?.fallback ? (
              <span className="rounded-full border border-signal-warning/30 bg-signal-warning/14 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                Fallback IA
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">
          {content}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 align-middle animate-pulse bg-current" />
          )}
        </p>
      </article>
    </div>
  );
}
