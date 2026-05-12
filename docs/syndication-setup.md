# Blog Syndication — guía de puesta en marcha

Cuando publiques un blog post nuevo en `/admin/blog`, el sistema lo re-publicará automáticamente en Medium, Dev.to y Hashnode con la URL canonical apuntando a `tresmilmillonesdelatidos.es/blog/[slug]` (cero penalización SEO por contenido duplicado, autoridad nueva acumulada para el dominio original).

**Plataformas activas:** se activa cada una en cuanto añadas sus env vars en Coolify. Las que no estén configuradas se marcan como `skipped` y no rompen nada.

## Variables a añadir en Coolify

```
MEDIUM_INTEGRATION_TOKEN=...
DEVTO_API_KEY=...
HASHNODE_API_KEY=...
HASHNODE_PUBLICATION_ID=...
```

## Cómo obtener cada token

### Medium (~3 min)

> **Nota:** Medium dejó de emitir Integration Tokens nuevos en 2024. Si tu cuenta es anterior a esa fecha, sigue funcionando. Si la creaste después, esta plataforma se saltará automáticamente (no rompe nada).

1. Entra a [medium.com/me/settings/security](https://medium.com/me/settings/security)
2. Sección **Integration tokens** → "Get integration token"
3. Nombre: "tresmilmillonesdelatidos sync"
4. Copia el token (`265b9d5ad...`)
5. En Coolify → variable `MEDIUM_INTEGRATION_TOKEN`

### Dev.to (~2 min)

1. Entra a [dev.to/settings/extensions](https://dev.to/settings/extensions)
2. Sección **DEV Community API Keys** → "Generate API Key"
3. Descripción: "Syndication from tresmilmillonesdelatidos"
4. Copia la key
5. En Coolify → variable `DEVTO_API_KEY`

### Hashnode (~3 min, requiere 2 valores)

**Token:**

1. Entra a [hashnode.com/settings/developer](https://hashnode.com/settings/developer)
2. Sección **Personal Access Tokens** → "Generate New Token"
3. Copia el token
4. En Coolify → variable `HASHNODE_API_KEY`

**Publication ID:**

1. Ve a tu blog de Hashnode (si no tienes, crea uno gratis en hashnode.com)
2. Settings del blog → la URL del settings contiene tu publication id: `hashnode.com/<PUBLICATION_ID>/settings`
3. En Coolify → variable `HASHNODE_PUBLICATION_ID`

Alternativa programática:

```bash
curl -X POST https://gql.hashnode.com \
  -H "Authorization: <HASHNODE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { me { publications(first:5) { edges { node { id title } } } } }"}'
```

---

## Cómo funciona

### Auto-trigger al publicar

Cuando cambias el `status` de un post a `published` desde el editor, el endpoint `PUT /api/admin/blog/[id]` dispara `syndicatePost(id)` en background (non-blocking — el editor devuelve inmediato; la sindicación corre en paralelo y los resultados aparecen en el panel cuando termina).

### Trigger manual

En el editor del post hay un panel **Sindicación** con:

- Estado por plataforma (Publicado / Fallo / Omitido / Pendiente)
- Link a la URL externa publicada
- Botón "reintentar" por plataforma
- Botón "force" para re-publicar (sobrescribe si ya hay un externalUrl)
- Botón "Sindicar todo" arriba para lanzar las 3 a la vez

### Idempotencia

El sistema **NO re-publica** un post que ya esté en `success` para una plataforma a menos que pulses "force". Esto evita duplicados accidentales si el cron se dispara varias veces.

---

## Modelo de datos

```prisma
model BlogSyndication {
  id           String    @id @default(cuid())
  blogPostId   String
  platform     String   // "medium" | "devto" | "hashnode"
  status       String   // pending | success | failed | skipped
  externalId   String?  // ID en la plataforma destino
  externalUrl  String?  // URL pública en plataforma destino
  errorMessage String?  // Si status=failed
  attemptedAt  DateTime
  succeededAt  DateTime?
  @@unique([blogPostId, platform])
}
```

---

## Endpoints

```
GET  /api/admin/blog/[id]/syndicate
     → lista filas BlogSyndication para ese post

POST /api/admin/blog/[id]/syndicate
     body: { platforms?: ["medium"|"devto"|"hashnode"], force?: boolean }
     → dispara la sindicación
```

Permiso requerido: `marketing:campaign` (admin-auth).

---

## Roadmap (Fase 2 y siguientes)

- **LinkedIn Newsletters** (necesita aprobación de LinkedIn API)
- **Twitter/X**: convertir artículo a hilo con LLM y publicar (API v2 — 100 €/mes)
- **Mastodon + Bluesky**: posts cortos con link al original
- **Newsletter propia** (Resend ya integrado): envío automático a la lista

Cuando uno de estos esté en demanda, se añade siguiendo el patrón actual: nuevo cliente en `src/services/syndication/<platform>.ts` + caso en el orquestador + env vars.
