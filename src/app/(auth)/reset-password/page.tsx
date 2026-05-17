"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from "@/styles/design-system";

const KNOWN_ERROR_CODES = new Set([
  "TOKEN_REQUIRED",
  "INVALID_TOKEN",
  "EXPIRED_TOKEN",
  "PASSWORD_TOO_SHORT",
  "RESET_FAILED",
]);

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Track whether error came from INVALID_TOKEN or EXPIRED_TOKEN to show
  // "request a new one" suffix even after error message is translated.
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function errorMessage(code: string | undefined): string {
    if (code && KNOWN_ERROR_CODES.has(code)) return t(`shared.errors.${code}`);
    return t("shared.errors.RESET_FAILED");
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setErrorCode(null);
    if (password !== confirmPassword) {
      setError(t("shared.passwordsMismatch"));
      return;
    }
    if (!token) {
      setError(t("shared.errors.TOKEN_REQUIRED"));
      setErrorCode("TOKEN_REQUIRED");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(errorMessage(data.error));
        setErrorCode(data.error ?? "RESET_FAILED");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/app"), 2000);
    } catch {
      setError(t("shared.errors.RESET_FAILED"));
      setErrorCode("RESET_FAILED");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={`${COMPONENTS.card} p-8 text-center space-y-4`}>
        <p className="text-red-400 text-sm">{t("reset.invalidLinkTitle")}</p>
        <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 text-sm">
          {t("reset.requestNewLink")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`${COMPONENTS.card} p-8 text-center space-y-4`}>
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">{t("reset.doneTitle")}</h2>
        <p className="text-zinc-400 text-sm">{t("reset.doneSubtitle")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          {(errorCode === "INVALID_TOKEN" || errorCode === "EXPIRED_TOKEN") && (
            <span> <Link href="/forgot-password" className="underline text-cyan-400">{t("reset.requestNewSuffix")}</Link>.</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-white">
          {t("reset.newPasswordLabel")}
        </label>
        <div className="relative">
          <input
            id="password" type={showPassword ? "text" : "password"} value={password} required
            minLength={8} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("shared.passwordMinPlaceholder")}
            className={`${COMPONENTS.inputField} pr-11`}
          />
          <button
            type="button" onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showPassword ? t('shared.hidePassword') : t('shared.showPassword')}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="block text-sm font-semibold text-white">
          {t("reset.confirmLabel")}
        </label>
        <input
          id="confirm" type={showPassword ? "text" : "password"} value={confirmPassword} required
          autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("shared.passwordPlaceholder")}
          className={COMPONENTS.inputField}
        />
      </div>

      <button
        type="submit" disabled={loading}
        className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? t("reset.submitting") : t("reset.submit")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <ResetPasswordPageInner />
  );
}

function ResetPasswordPageInner() {
  const t = useTranslations("auth");
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>{t("reset.title")}</h1>
          <p className="text-zinc-400">{t("reset.subtitle")}</p>
        </div>
        <Suspense fallback={<div className="text-zinc-500 text-sm text-center">{t("reset.loading")}</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
