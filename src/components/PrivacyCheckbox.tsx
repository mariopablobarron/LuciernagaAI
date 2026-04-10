"use client";

type PrivacyCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Extra context about what data is collected */
  context?: string;
};

export default function PrivacyCheckbox({ checked, onChange, context }: PrivacyCheckboxProps) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0 shrink-0"
      />
      <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
        {context && <span className="text-zinc-400">{context} </span>}
        Acepto la{" "}
        <a href="/privacy" target="_blank" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
          politica de privacidad
        </a>{" "}
        y los{" "}
        <a href="/terms" target="_blank" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
          terminos de uso
        </a>.
      </span>
    </label>
  );
}
