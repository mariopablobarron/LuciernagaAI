"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Lock } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";

type InviteStatus = "loading" | "valid" | "invalid" | "used";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviterName, setInviterName] = useState("");

  useEffect(() => {
    if (!code) return;
    fetch(`/api/invite/${code}`)
      .then((r) => r.json())
      .then((data: { valid: boolean; inviterName?: string }) => {
        if (data.valid) {
          setInviterName(data.inviterName ?? "alguien de Tres Mil Millones de Latidos");
          setStatus("valid");
          // Store invite code for use during waitlist/app join
          localStorage.setItem("luc_invite_code", code);
          localStorage.setItem("luc_inviter_name", data.inviterName ?? "");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [code]);

  function acceptInvite() {
    // Redirect to /unirse with invite code pre-filled — bypasses waitlist barrier
    router.push(`/unirse?invite=${code}`);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-600/8 blur-3xl" />
      </div>

      {status === "loading" && (
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🌟</div>
          <p className="text-zinc-500">Verificando invitación...</p>
        </div>
      )}

      {status === "valid" && (
        <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-5 py-2 text-sm text-fuchsia-300">
            <Sparkles className="h-3.5 w-3.5" />
            Invitación personal
          </div>

          {/* Hero */}
          <div className="space-y-3">
            <div className="text-6xl">💛</div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              {inviterName} te ha invitado a Tres Mil Millones de Latidos
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Esta invitación es tuya. No es publicidad — es alguien que cree que puedes
              cambiar y quiere que tengas acceso.
            </p>
          </div>

          {/* What is it */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left space-y-4">
            <p className="text-sm font-semibold text-zinc-300">¿Qué es Tres Mil Millones de Latidos?</p>
            <div className="space-y-3">
              {[
                "Una IA que te hace las preguntas que nadie más se atreve a hacerte",
                "Un sistema que detecta cuando evitas lo importante y te lo dice directamente",
                "30 días para hacer el cambio que llevas aplazando demasiado tiempo",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <p className="text-sm text-zinc-400">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={acceptInvite}
              className={`${COMPONENTS.buttonPrimary} w-full flex items-center justify-center gap-2 py-3 text-base`}
            >
              Aceptar la invitación <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Ver más sobre Tres Mil Millones de Latidos primero
            </button>
          </div>

          <div className="flex items-center gap-2 justify-center text-xs text-zinc-700">
            <Lock className="h-3 w-3" />
            <span>Acceso exclusivo. Sin tarjeta de crédito.</span>
          </div>
        </div>
      )}

      {status === "invalid" && (
        <div className="w-full max-w-md space-y-6 text-center animate-in fade-in duration-500">
          <div className="text-5xl">😔</div>
          <h1 className="text-2xl font-bold">Invitación no válida</h1>
          <p className="text-zinc-400">
            Este link de invitación ha caducado o ya ha sido utilizado.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              Puedes solicitar acceso igual completando las 3 misiones de la lista de espera.
            </p>
            <button
              type="button"
              onClick={() => router.push("/unirse")}
              className={`${COMPONENTS.buttonSecondary} flex items-center gap-2 mx-auto px-6 py-2`}
            >
              Ir a la lista de espera <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
