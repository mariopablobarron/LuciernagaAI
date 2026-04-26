# Eval suite del coach

Scripts para evaluar el contenido de las respuestas del mentor frente a queries reales de counseling. **No son tests del pipeline completo** (intercept, flow, persistencia) — para eso usar `processMessage.golden.test.ts`. Aquí evaluamos el OUTPUT del modelo dado el `BASE_PROMPT` actual + guidances.

## Counselling Bench

Dataset de 100 queries reales tomadas de [`EmoCareAI/ChatPsychiatrist`](https://github.com/EmoCareAI/ChatPsychiatrist) (Apache-2.0). Sintetizadas con GPT-4 desde transcripciones reales de sesiones de counseling. Cubren topics como ansiedad, perfeccionismo, relaciones, duelo, estrés laboral, etc.

**Idioma original: inglés.** El mentor responde en español. La eval mide cómo trata cada caso emocional, no la fidelidad lingüística.

### Uso

```bash
# Run completo (100 queries, ~5-10 min, $0.20-1.00 según modelo)
OPENROUTER_API_KEY=$(grep OPENROUTER_API_KEY ~/coolify-secrets-backup/luciernaga-ai-*.env | cut -d= -f2-) \
  npx tsx eval/run-counselling-bench.ts

# Subset rápido para iterar
npx tsx eval/run-counselling-bench.ts --limit 10

# Ajustar paralelismo
npx tsx eval/run-counselling-bench.ts --limit 30 --concurrency 4
```

### Output

`eval/results/counselling_bench_<YYYY-MM-DD-HHmm>.jsonl`, una línea por query:

```json
{
  "question_id": 1,
  "category": "generic",
  "query": "I'm not sure if breathing exercises...",
  "response": "Lo que describes...",
  "fallback": false,
  "latencyMs": 1234
}
```

### Qué revisar

Lectura manual de 10-15 respuestas aleatorias del .jsonl. Criterios:

1. **¿Hace preguntas o da consejos directos?** El mentor debe interpelar antes de instruir. Si responde con listas tipo "Practice mindfulness", "First, identify..." es regresión.
2. **¿Reconoce la emoción antes de actuar?** Validación antes de propuesta.
3. **¿Termina con UNA pregunta concreta o UNA acción pequeña?** No con monólogos abiertos.
4. **¿Mantiene tono directo + respetuoso?** Sin condescendencia ni jerga clínica.
5. **¿Evita conjugaciones de género?** En este eval `userGender = neutral` por defecto.

### Diff entre runs

Cuando cambies el coach prompt y re-ejecutes, comparar dos runs:

```bash
# Extraer solo respuestas de cada run
jq -r '"--- q\(.question_id) ---\n\(.response)\n"' eval/results/counselling_bench_2026-04-26-1730.jsonl > /tmp/before.txt
jq -r '"--- q\(.question_id) ---\n\(.response)\n"' eval/results/counselling_bench_2026-04-26-1830.jsonl > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt | less
```

## Roadmap

- [ ] `eval/judge-counselling.ts` — pasar pares (query, response) por Claude con rúbrica explícita y dar score 1-5 por cada criterio (Fase 2).
- [ ] Traducir las queries a español para eval lingüísticamente precisa.
- [ ] Eval del pipeline completo (no solo prompt) con usuarios de test sintéticos.

## Atribución

Las 100 queries vienen de `EmoCareAI/ChatPsychiatrist` (Apache-2.0). El dataset original (`Psych8K`) fue construido a partir de ~260 transcripciones reales de sesiones de counseling, sintetizadas con GPT-4.
