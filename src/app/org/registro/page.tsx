"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, User, Mail, Lock, Tag, ChevronRight, Check } from "lucide-react";

const ORG_TYPES = [
  { value: "company", label: "Empresa", desc: "Equipo corporativo o startup" },
  { value: "clinic", label: "Clinica", desc: "Centro de psicologia o salud mental" },
  { value: "school", label: "Centro educativo", desc: "Universidad, instituto o escuela" },
];

export default function OrgRegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Step 1: Org info
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("company");

  // Step 2: Admin info
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    if (!slug || slug === generateSlug(orgName)) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrors([]);
    setLoading(true);

    try {
      const res = await fetch("/api/org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          slug,
          type,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        details?: string[];
        organization?: { slug: string };
      };

      if (!res.ok || !data.ok) {
        if (data.details?.length) {
          setErrors(data.details);
        } else if (data.error === "SLUG_TAKEN") {
          setError("Ese identificador ya esta en uso. Prueba otro.");
        } else if (data.error === "ADMIN_EMAIL_TAKEN") {
          setError("Ese email ya esta registrado en otra organizacion.");
        } else {
          setError(data.error ?? "Error al registrar");
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Organizacion creada</h1>
          <p className="text-sm text-zinc-400">
            Ya puedes iniciar sesion con tu slug <span className="font-mono text-violet-400">{slug}</span> y las credenciales que acabas de crear.
          </p>
          <Link
            href="/org/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all"
          >
            Ir al login <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registra tu organizacion</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Empieza a usar Tres Mil Millones de Latidos con tu equipo
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step >= 1 ? "bg-violet-500/15 text-violet-300 border border-violet-500/30" : "bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>
            <Building2 className="w-3 h-3" /> Organizacion
          </div>
          <div className="w-6 h-px bg-zinc-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step >= 2 ? "bg-violet-500/15 text-violet-300 border border-violet-500/30" : "bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>
            <User className="w-3 h-3" /> Administrador
          </div>
        </div>

        {/* Error display */}
        {(error || errors.length > 0) && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error && <p>{error}</p>}
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Organization */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Nombre de la organizacion</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    placeholder="Mi Clinica"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Identificador (slug)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="mi-clinica"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-zinc-600">Se usa para iniciar sesion. Solo letras, numeros y guiones.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Tipo de organizacion</label>
                <div className="grid grid-cols-3 gap-2">
                  {ORG_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        type === t.value
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${type === t.value ? "text-violet-300" : "text-zinc-300"}`}>{t.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!orgName.trim() || !slug.trim()) return;
                  setStep(2);
                }}
                disabled={!orgName.trim() || !slug.trim()}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                Siguiente
              </button>
            </>
          )}

          {/* Step 2: Admin */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Tu nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ana Garcia"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Email profesional</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="ana@mi-clinica.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:border-zinc-600 transition-all"
                >
                  Atras
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear organizacion"}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Login link */}
        <p className="text-center text-xs text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/org/login" className="text-violet-400 hover:text-violet-300">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
