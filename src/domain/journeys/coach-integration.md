# Journey ↔ Coach Integration Guide

## How to connect journeys to the existing chat (non-breaking)

The journey system is designed as an **additive layer**. To integrate with the coach:

### Step 1: Add `journey` field to CoachContext type

In `src/services/coach.ts`, add to the `CoachContext` type:

```typescript
journey?: {
  activeJourney: string;
  currentPhase: string;
  currentModule: string;
  progress: number;
  lastExerciseReflection: string | null;
  nextExercise: string | null;
} | null;
```

### Step 2: Add journey prompt builder to `buildCoachPrompt`

In `src/services/coach.ts`, add after `buildOnboardingGuidance`:

```typescript
function buildJourneyGuidance(context: CoachContext): string {
  if (!context.journey) return "";
  return context.journey as string; // Pre-built by journey-coach-bridge.ts
}
```

### Step 3: In processMessage.ts, load journey context

In the DB phase of `processMessage.ts`, add:

```typescript
import { buildJourneyPromptBlock } from "@/services/journey-coach-bridge";

// Inside the DB try/catch block, after loading goals:
const journeyPromptBlock = await buildJourneyPromptBlock(userId).catch(() => null);
```

Then add to `coachContext`:

```typescript
const coachContext = {
  // ...existing fields...
  journeyPrompt: journeyPromptBlock, // string injected into system prompt
};
```

### What changes:
- `CoachContext` type gets one new optional field
- `buildCoachPrompt` gets one new section (appended, not modifying existing)
- `processMessage` gets one new async call in the DB phase

### What does NOT change:
- ai.ts (untouched)
- The chat route handler (untouched)
- The streaming logic (untouched)
- Goal/avoidance/crisis systems (untouched)
- Telegram webhook (untouched)
