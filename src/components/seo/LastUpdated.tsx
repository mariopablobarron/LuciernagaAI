import { Clock } from "lucide-react";

type Props = {
  /** ISO 8601 date when the content was last meaningfully updated. */
  iso: string;
  /** Optional human label; defaults to a formatted Spanish long date. */
  label?: string;
  /** Optional reviewer attribution ("Revisado por el equipo clínico", etc.). */
  reviewedBy?: string;
  className?: string;
};

const LONG_DATE = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Renders a visible "Última actualización" signal. Uses a semantic <time>
 * element with a valid dateTime attribute so AI search engines (Perplexity,
 * Google AI Overviews, ChatGPT) can parse the freshness signal — they weigh
 * dated content more heavily than undated content.
 *
 * Also emits a microdata `itemprop="dateModified"` for belt-and-suspenders.
 */
export function LastUpdated({ iso, label, reviewedBy, className = "" }: Props) {
  const display = label ?? LONG_DATE.format(new Date(iso));

  return (
    <p
      className={`inline-flex items-center gap-1.5 text-[11px] text-zinc-500 ${className}`}
    >
      <Clock className="w-3 h-3" aria-hidden />
      <span>
        Última actualización:{" "}
        <time dateTime={iso} itemProp="dateModified" className="text-zinc-400">
          {display}
        </time>
      </span>
      {reviewedBy && (
        <>
          <span aria-hidden>·</span>
          <span>{reviewedBy}</span>
        </>
      )}
    </p>
  );
}
