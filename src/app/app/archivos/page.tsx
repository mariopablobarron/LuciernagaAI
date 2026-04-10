"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileImage, FilePlus, Trash2, Download, Eye } from "lucide-react";
import { toast } from "sonner";

type UserFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sizeLabel: string;
  source: string;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  upload: "Subido",
  chat: "Desde el chat",
  avatar: "Avatar",
};

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `hace ${d}m`;
  if (d < 1440) return `hace ${Math.floor(d / 60)}h`;
  return `hace ${Math.floor(d / 1440)}d`;
}

export default function ArchivosPage() {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/files", { credentials: "include" });
      const data = (await res.json()) as { files: UserFile[] };
      setFiles(data.files ?? []);
    } catch {
      toast.error("Error al cargar archivos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFiles(); }, [loadFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("El archivo debe ser menor de 500 KB");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/user/files", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type, data: dataUrl }),
      });

      if (res.ok) {
        toast.success("Archivo subido");
        void loadFiles();
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(err.message ?? "Error al subir");
      }
    } catch {
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await fetch("/api/user/files", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Archivo eliminado");
    void loadFiles();
  }

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app/settings" className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Mis archivos</h1>
              <p className="text-sm text-zinc-500">{files.length} archivos · biblioteca personal</p>
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 active:scale-95 transition-all"
            >
              <FilePlus className="w-4 h-4" />
              {uploading ? "Subiendo..." : "Subir archivo"}
            </button>
          </div>
        </div>

        {/* Context */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
          <p className="text-xs text-zinc-500">
            Aqui se guardan las imagenes y documentos que subes al chat o a tu perfil.
            Max 500 KB por archivo. Formatos: PNG, JPEG, WebP, GIF, PDF.
          </p>
        </div>

        {/* Files grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileImage className="w-12 h-12 text-zinc-700 mx-auto" />
            <p className="text-zinc-400">No tienes archivos todavia</p>
            <p className="text-xs text-zinc-600">Sube una imagen o adjunta algo en el chat</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((f) => (
              <div key={f.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden group">
                {/* Thumbnail */}
                {isImage(f.mimeType) ? (
                  <button
                    onClick={() => setPreview(`/api/user/files/${f.id}`)}
                    className="w-full h-28 bg-zinc-800 flex items-center justify-center overflow-hidden"
                  >
                    <img
                      src={`/api/user/files/${f.id}`}
                      alt={f.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ) : (
                  <div className="w-full h-28 bg-zinc-800 flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-zinc-600" />
                  </div>
                )}

                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium text-white truncate">{f.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600">{f.sizeLabel} · {SOURCE_LABEL[f.source] ?? f.source}</span>
                    <div className="flex items-center gap-1">
                      {isImage(f.mimeType) && (
                        <button
                          onClick={() => setPreview(`/api/user/files/${f.id}`)}
                          className="p-1 text-zinc-600 hover:text-white transition-colors"
                          title="Ver"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a
                        href={`/api/user/files/${f.id}`}
                        download={f.name}
                        className="p-1 text-zinc-600 hover:text-white transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => void handleDelete(f.id, f.name)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-700">{timeAgo(f.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image preview modal */}
        {preview && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
