# Agente SEO — Setup operativo

Pipeline diario que descarga GA4 + Search Console, los espeja en Postgres y detecta 10 tipos de oportunidades. Trabaja sobre la infraestructura ya existente del dashboard `/admin/analytics/external` (Service Account compartido).

## Pre-requisitos

Ya cubiertos por `docs/setup-analytics-external.md`. Resumen:

- `GOOGLE_SERVICE_ACCOUNT_JSON_B64` configurada en Coolify.
- `GA4_PROPERTY_ID` configurada.
- `GSC_SITE_URL` configurada.
- Service Account añadido como **Viewer** en GA4 y como **Restricted user** en Search Console.

Sin estas vars el agente devuelve `{ ok: false, reason: "not_configured" }` en cada sync — no rompe nada pero no genera oportunidades.

## Cómo se compone

```
Cron (cron-job.org, 04:00 UTC)
    ↓
GET /api/cron/seo-sync?secret=$CRON_SECRET
    ↓
1. syncGa4DailyByPage(28d)        → upsert Ga4DailyMetric
2. syncGscDailyByQuery(28d)       → upsert GscDailyQuery
3. syncGscDailyByPage(28d)        → upsert GscDailyPage
4. runAllDetectors()              → 10 detectores → upsert SeoOpportunity (por fingerprint)
```

Las tablas espejo (`Ga4DailyMetric`, `GscDailyQuery`, `GscDailyPage`) usan `@@unique([date, X])` y `upsert` — re-correr el sync nunca duplica.

`SeoOpportunity` usa `fingerprint = sha1(kind|url|query)[:32]` también único — preserva el `status` que el admin haya cambiado (open → in_progress → done/dismissed).

## Detectores

| kind | Cuándo dispara | Prioridad |
|------|----------------|-----------|
| `ranking_4_20` | Query con avg position 4-20 y ≥50 impresiones | 8 |
| `low_ctr_high_impressions` | URL con ≥100 impresiones y CTR <2% | 9 |
| `clicks_drop` | URL con caída ≥30% vs ventana anterior | 7 |
| `impressions_growing_low_clicks` | Impresiones +30% pero clicks no siguen | 7 |
| `cannibalization` | Mismo slug en ≥2 URLs | 6 |
| `orgtraffic_low_conversion` | ≥100 sesiones con conversión <2.5% | 8 |
| `high_conversion_low_traffic` | Conversión ≥5% con <100 sesiones | 8 |
| `new_content` | Query con ≥200 impresiones, posición >20, sin URL propia | 6 |
| `title_meta` | CTR <50% del esperado por su posición (curva clásica SEO) | 7 |
| `internal_links` | URL en top 10 con buen rendimiento | 5 |

Los thresholds están al inicio de `src/services/seo-opportunities.ts` — ajusta si tu volumen es muy distinto.

## Programar el cron

En cron-job.org (donde ya tienes el resto de tus crons):

| Campo | Valor |
|-------|-------|
| Title | `mentor-web · seo-sync` |
| URL | `https://tresmilmillonesdelatidos.es/api/cron/seo-sync?secret=$CRON_SECRET` |
| Schedule | `0 4 * * *` (04:00 UTC, antes del horario europeo activo) |
| Timeout | 300 segundos |

Después regístralo en `/admin/routines` con `X-Admin-Secret` para que aparezca en el listado interno.

## Validación manual

```bash
# Sync (puede tardar 1-3 min con 28 días de histórico)
curl -s "https://tresmilmillonesdelatidos.es/api/cron/seo-sync?secret=$CRON_SECRET" | jq

# Ver oportunidades (sin auth admin, vía CRON_SECRET)
curl -s "https://tresmilmillonesdelatidos.es/api/admin/seo-opportunities?secret=$CRON_SECRET&limit=10" | jq '.opportunities[] | {kind, priority, url, query, recommendation}'

# Solo sync sin detectores (útil si solo quieres refrescar datos)
curl -s "https://tresmilmillonesdelatidos.es/api/cron/seo-sync?secret=$CRON_SECRET&skipDetectors=1" | jq

# Sync más histórico (90 días — solo la primera vez para tener base)
curl -s "https://tresmilmillonesdelatidos.es/api/cron/seo-sync?secret=$CRON_SECRET&daysBack=90" | jq
```

## UI

`/admin/analytics/seo` (link desde `/admin/analytics`):

- Lista filtrable por status (open/in_progress/done/dismissed/all).
- Filtro por tipo.
- Click expande la card → métricas JSON + acciones (cambiar status).
- Botón **CSV** descarga la lista actual.

## Limitaciones conocidas

- **Canibalización por slug**, no por query exacto. Para canibalización real (mismo query, varias URLs ranquean) hay que extender el sync con la dimensión combinada `(date, query, page)` — es otra tabla, +25k rows extra/día. Decisión postergada.
- **Internal links** es heurístico (URL en top 10 con tráfico). GA4 sin `previousPagePath` no nos da grafo real. Para grafo real → tu propio crawler o herramienta externa (Screaming Frog).
- **Conversiones** dependen de que GA4 tenga eventos `purchase` o `conversion` configurados. Si no los tienes, los detectores 6 y 7 no disparan nada.

## Coste

- **Google APIs**: gratis (cuotas más que sobradas para 1 sync diario).
- **Postgres**: ~25k filas/día (mayoría en `GscDailyQuery`). Con 90 días retenidos ≈ 2-3 MB. Despreciable.

## Limpieza opcional (futuro)

Cuando el histórico crezca, conviene un cron que purge `Ga4DailyMetric`/`GscDailyQuery`/`GscDailyPage` de hace >180 días. Sigue el patrón de `cron/purge-logs`. No urgente al inicio.
