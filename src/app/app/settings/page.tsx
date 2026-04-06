import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PrivacySettings } from "@/components/ui/privacy-settings";

export const metadata = {
  title: "Configuración y Privacidad | Tres Mil Millones de Latidos",
  description: "Gestiona tus datos personales y privacidad.",
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Cabecera de la página */}
        <header className="flex items-center gap-4 border-b border-zinc-800 pb-6">
          <Link
            href="/app"
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            title="Volver al chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-fuchsia-500" />
              Privacidad y Seguridad
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gestiona el control total sobre tus datos personales y tu cuenta.
            </p>
          </div>
        </header>

        {/* Contenedor principal del componente */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PrivacySettings />
        </main>
      </div>
    </div>
  );
}
