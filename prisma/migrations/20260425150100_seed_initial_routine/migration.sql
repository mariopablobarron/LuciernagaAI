-- Seed the routine scheduled in conversation that introduced /admin/routines.
-- Idempotent: ON CONFLICT keeps existing rows untouched.

INSERT INTO "ScheduledAgent" (
    "id", "triggerId", "name", "purpose",
    "scheduledFor", "promptSummary", "model", "repo",
    "status", "createdAt", "updatedAt"
) VALUES (
    'seed_trackers_cleanup_14d',
    'trig_013N8djs5QFDfuKofbXLT8ja',
    'Trackers cleanup — revisión 14d post-lanzamiento',
    'Revisar tabla CustomTracker y proponer consolidación: Plausible/PostHog activos > 7d → migrar a env hardcoded; pausados > 14d → eliminar; Hotjar/Clarity > 30d → revisar.',
    '2026-05-09T09:00:00Z',
    'Eres un agente remoto que revisa el sistema de Trackers personalizados desplegado hace ~14 días. Llama al endpoint público /api/public/trackers/active, evalúa cada tracker según reglas (Plausible/PostHog permanentes → env var; pausados > 14d → eliminar), y abre PR en branch auto/trackers-cleanup-<timestamp> si hay limpieza concreta.',
    'claude-sonnet-4-6',
    'https://github.com/mariopablobarron/LuciernagaAI',
    'scheduled',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("triggerId") DO NOTHING;
