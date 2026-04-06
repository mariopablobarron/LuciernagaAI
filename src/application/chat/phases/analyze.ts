/**
 * Phase 1: ANALYZE
 *
 * Synchronous analysis of the user message — no DB calls, no side effects.
 * Detects: emotional state, risk level, intent, transitional void signals,
 * and runs the dialogue flow engine.
 */

import type { UserState } from "@/domain/types";
import { detectUserState } from "@/services/state";
import { detectRiskLevel, type RiskLevel } from "@/services/risk";
import { detectIntent } from "@/services/intent";
import { runFlow, hydrateDialogueState, persistDialogueState } from "@/services/flows";
import { logInfo } from "@/lib/logger";

// ─── Transitional void detection ──────────────────────────────────────────────

export function detectTransitionalVoidSignals(message: string): {
  confusionScore: number;
  identityShift: boolean;
  directionClarity: number;
} {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const confusionPhrases = [
    "no se", "no entiendo", "confundido", "confundida",
    "no tengo claro", "no se hacia donde", "no se que hacer",
    "no se que quiero", "no se quien soy", "no se quien",
    "perdido", "perdida", "sin rumbo", "no se adonde",
  ];
  const identityPhrases = [
    "ya no soy", "no me reconozco", "todo ha cambiado",
    "ya no encaja", "no encajo", "quien soy",
    "cambie", "me perdi", "transicion", "nueva etapa",
    "ya no me", "no se quien era", "siento que ya no",
    "no me siento yo", "me siento diferente", "vacio",
    "ya no tengo identidad",
  ];

  const confusionMatches = confusionPhrases.filter((p) => normalized.includes(p)).length;
  const confusionScore = Math.min(1, confusionMatches / 3);
  const identityShift = identityPhrases.some((p) => normalized.includes(p));
  const directionClarity = Math.max(0, 1 - confusionScore - (identityShift ? 0.3 : 0));

  return { confusionScore, identityShift, directionClarity };
}

// ─── Crisis helpers ───────────────────────────────────────────────────────────

export function isCrisisLevel(level: RiskLevel): level is "high" | "critical" {
  return level === "high" || level === "critical";
}

export function isCrisisInterventionMessage(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const signals = [
    "ya hable con", "ya pedi ayuda", "ya contacte",
    "ya llame al 112", "ya llame al 911",
    "estoy con mi familia", "estoy acompanado", "estoy acompañado",
    "ya estoy seguro",
  ];
  return signals.some((s) => normalized.includes(s));
}

export function mapRiskLevelToCrisisCount(level: RiskLevel): number {
  return level === "high" || level === "critical" ? 1 : 0;
}

// ─── Result type ──────────────────────────────────────────────────────────────

export type AnalyzeResult = {
  state: UserState;
  tvSignals: { confusionScore: number; identityShift: boolean; directionClarity: number };
  detectedIntent: string;
  riskLevel: RiskLevel;
  crisisMode: boolean;
  crisisSource: "detected" | "active_state" | "none";
  crisisActiveUntil: string | null;
  flowContext: {
    currentIntent: string;
    currentStep: number;
    activeFlow: string | null;
    instruction: string | null;
  };
};

// ─── Main phase function ──────────────────────────────────────────────────────

export async function analyzeMessage(
  userId: string,
  message: string
): Promise<AnalyzeResult> {
  const state = detectUserState(message);
  const tvSignals = detectTransitionalVoidSignals(message);
  const detectedIntent = detectIntent(message);
  const riskLevel = detectRiskLevel(message);

  const dialogueState = await hydrateDialogueState(userId);
  const flowContext = runFlow({ ...dialogueState, currentIntent: detectedIntent }, message);
  void persistDialogueState(userId, {
    currentIntent: flowContext.currentIntent,
    currentStep: flowContext.currentStep,
    activeFlow: flowContext.activeFlow,
  });

  const crisisMode = isCrisisLevel(riskLevel);

  logInfo("STATE", "state_detected", {
    userId,
    state,
    intent: detectedIntent,
    activeFlow: flowContext.activeFlow,
    flowStep: flowContext.currentStep,
    messageLength: message.length,
  });
  logInfo("RISK", "risk_level_detected", { userId, riskLevel, crisisMode });

  return {
    state,
    tvSignals,
    detectedIntent,
    riskLevel,
    crisisMode,
    crisisSource: crisisMode ? "detected" : "none",
    crisisActiveUntil: null,
    flowContext,
  };
}
