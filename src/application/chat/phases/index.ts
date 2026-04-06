/**
 * Chat Pipeline Phases
 *
 * processMessage.ts follows this 5-phase pipeline:
 *
 * 1. ANALYZE  (sync)  → detectUserState, detectRiskLevel, detectIntent, flows
 * 2. ENRICH   (async) → DB session, conversation, emotions, goals, avoidance, transformation
 * 3. INTERCEPT        → Action lock, crisis response, transitional void (early returns)
 * 4. CONTEXT          → Build coach context, web search, impulse profile, journey
 * 5. RESPOND          → AI generation (impulse/JSON/SSE streaming), persistence
 *
 * Each phase reads and writes to a shared PipelineContext object.
 * The phases are currently inlined in processMessage.ts but documented here
 * for clarity and future extraction.
 *
 * Extraction priority (when adding tests):
 * - Phase 3 (Intercept) → easiest to extract, pure logic with clear early returns
 * - Phase 1 (Analyze) → sync, no side effects, easy to test
 * - Phase 4 (Context) → moderate, builds a data structure
 * - Phase 2 (Enrich) → hardest, heavy DB interaction
 * - Phase 5 (Respond) → depends on all previous phases
 */

export type { PipelineContext, FlowContext } from "./types";
