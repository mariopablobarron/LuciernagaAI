"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { Save, Upload, Trash2 } from "lucide-react";

type Locale = "es" | "en";

type ApiGet = {
  keys: string[];
  locales: Locale[];
  values: Record<Locale, Record<string, string>>;
};

const FIELDS: Array<{ key: string; label: string; long?: boolean }> = [
  { key: "team.sectionLabel", label: "Etiqueta de sección" },
  { key: "team.title", label: "Título" },
  { key: "team.subtitle", label: "Subtítulo", long: true },
  { key: "team.aiRole.title", label: "IA — título" },
  { key: "team.aiRole.description", label: "IA — descripción", long: true },
  { key: "team.humanRole.title", label: "Equipo humano — título" },
  { key: "team.humanRole.description", label: "Equipo humano — descripción", long: true },
  { key: "team.founder.name", label: "Fundador — nombre" },
  { key: "team.founder.role", label: "Fundador — rol" },
  { key: "team.founder.bio", label: "Fundador — bio", long: true },
  { key: "team.advisor.name", label: "Asesora — nombre" },
  { key: "team.advisor.role", label: "Asesora — rol" },
  { key: "team.advisor.bio", label: "Asesora — bio", long: true },
  { key: "team.transparency", label: "Párrafo de transparencia", long: true },
];

export default function EquipoAdminPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Locale, Record<string, string>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>("es");
  const [photoVersion, setPhotoVersion] = useState<number>(Date.now());
  const founderInputRef = useRef<HTMLInputElement>(null);
  const advisorInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/team", { credentials: "include" });
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as ApiGet;
      setValues(data.values);
    } catch {
      toast.error("No se pudo cargar el contenido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/team", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("save_failed");
      toast.success("Cambios guardados");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(key: "team-founder" | "team-advisor", file: File) {
    const fd = new FormData();
    fd.append("key", key);
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/marketing/team/photo", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "upload_failed");
      }
      toast.success("Foto actualizada");
      setPhotoVersion(Date.now());
      router.refresh();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  }

  async function handleDeletePhoto(key: "team-founder" | "team-advisor") {
    if (!confirm("¿Quitar la foto guardada?")) return;
    try {
      const res = await fetch(`/api/admin/marketing/team/photo?key=${key}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");
      toast.success("Foto eliminada");
      setPhotoVersion(Date.now());
      router.refresh();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  const setField = (locale: Locale, key: string, v: string) => {
    setValues((prev) => {
      if (!prev) return prev;
      return { ...prev, [locale]: { ...prev[locale], [key]: v } };
    });
  };

  return (
    <AdminShell
      title="Contenido del equipo"
      subtitle="Edita los textos y fotos que aparecen en la sección 'Quién está detrás' de la landing."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <AdminPanel
        title="Fotos"
        description="Imágenes de Mario y Amaya. Se muestran en la landing. JPG/PNG/WebP, máx. 2 MB."
      >
        <div className="grid md:grid-cols-2 gap-5">
          <PhotoCard
            label="Fundador (Mario)"
            mediaKey="team-founder"
            previewFallback="/team/mario.png"
            version={photoVersion}
            onPick={() => founderInputRef.current?.click()}
            onDelete={() => handleDeletePhoto("team-founder")}
          />
          <input
            ref={founderInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload("team-founder", f);
              e.target.value = "";
            }}
          />
          <PhotoCard
            label="Asesora clínica (Amaya)"
            mediaKey="team-advisor"
            previewFallback={null}
            version={photoVersion}
            onPick={() => advisorInputRef.current?.click()}
            onDelete={() => handleDeletePhoto("team-advisor")}
          />
          <input
            ref={advisorInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload("team-advisor", f);
              e.target.value = "";
            }}
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Textos"
        description="Cambia los textos que se muestran en la landing. Idiomas: español e inglés."
      >
        <div className="flex gap-2 mb-5">
          {(["es", "en"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setActiveLocale(loc)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeLocale === loc
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-200"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>

        {loading || !values ? (
          <div className="text-sm text-zinc-500">Cargando…</div>
        ) : (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  {f.label}
                </label>
                {f.long ? (
                  <textarea
                    className="w-full min-h-[90px] rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
                    value={values[activeLocale][f.key] ?? ""}
                    onChange={(e) => setField(activeLocale, f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
                    value={values[activeLocale][f.key] ?? ""}
                    onChange={(e) => setField(activeLocale, f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}

function PhotoCard({
  label,
  mediaKey,
  previewFallback,
  version,
  onPick,
  onDelete,
}: {
  label: string;
  mediaKey: string;
  previewFallback: string | null;
  version: number;
  onPick: () => void;
  onDelete: () => void;
}) {
  const src = `/api/media/${mediaKey}?v=${version}`;
  const [hasAsset, setHasAsset] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setHasAsset(r.ok);
      })
      .catch(() => {
        if (!cancelled) setHasAsset(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const previewSrc = hasAsset ? src : previewFallback;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-sm font-medium text-zinc-200 mb-3">{label}</p>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-900 ring-2 ring-zinc-800 shrink-0">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={label}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
              Sin foto
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPick}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm"
          >
            <Upload className="h-4 w-4" />
            Subir nueva foto
          </button>
          {hasAsset && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm border border-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Quitar foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
