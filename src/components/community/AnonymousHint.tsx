type Props = { className?: string };

// Recordatorio compartido en cualquier composer de comunidad. El copy está
// alineado con el mensaje de error del backend (src/lib/pii-filters.ts) para
// que el usuario reconozca la razón si le rechaza un post.
export default function AnonymousHint({ className }: Props) {
  return (
    <p className={`text-[10px] text-zinc-600 ${className ?? ""}`}>
      Anónimo · sin datos de contacto, teléfonos ni enlaces externos
    </p>
  );
}
