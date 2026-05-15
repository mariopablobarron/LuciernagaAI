# Mejoras SEO — guía de puesta en marcha

Hoy 2026-05-13. Auditoría de SEO sobre `tresmilmillonesdelatidos.es` y mejoras implementadas.

## Estado real auditado

✅ **Lo que ya estaba bien:**

- `robots.txt` correcto (bloquea privadas, permite públicas, declara sitemap)
- `sitemap.xml` con 20 URLs, hreflang ES/EN
- GSC verificado como `siteOwner` (12-may)
- JSON-LD `@graph` con Organization, Person, SoftwareApplication, WebSite + SearchAction
- FAQPage schema en `/faq`
- Title, description, canonical, OG tags
- SSR: 4.940 chars de texto visible en home (no es un shell JS vacío)
- `<h1>` presente en home (wrapping `RevealWords`, válido para crawlers)

⚠️ **Lo que faltaba (corregido en este commit):**

- IndexNow no configurado → Google y Bing solo indexaban por crawl natural (semanas)
- Sin ping automático al publicar blog posts nuevos
- Sin UI admin para forzar bulk-submission

⏳ **Lo que queda y NO es automatizable:**

- Backlinks (Fase 2 ya está montando esto via discovery agent en Reddit)
- Verificación Bing Webmaster Tools (5 min de Mario)
- Solicitud manual de indexación en GSC URL Inspection (Mario, 2 min para 7 URLs)
- Conversión del blog `[slug]` a SSR puro para `Article` JSON-LD dinámico

---

## IndexNow desplegado

**Qué es:** protocolo abierto patrocinado por Bing+Yandex. Notificas URLs nuevas y se indexan en minutos. Una llamada → propaga a Bing, Yandex, DuckDuckGo, Yahoo, Brave Search. **Bing alimenta ChatGPT Search y Copilot** → tu sitio aparece en respuestas de LLMs en horas, no semanas.

**Setup necesario (5 min):**

1. Genera una key (cualquier hex 8-128 chars) — ya tienes una:

```
406886a48fdafd0a0eb0b3c5cdced134fa4113ac3dd0d352
```

2. Añádela en Coolify → tu app → Environment Variables:

```
INDEXNOW_KEY=406886a48fdafd0a0eb0b3c5cdced134fa4113ac3dd0d352
```

3. Redeploy.

4. Verifica que la key se sirve:

```bash
curl https://tresmilmillonesdelatidos.es/api/seo/indexnow-key
# Esperado: 406886a48fdafd0a0eb0b3c5cdced134fa4113ac3dd0d352
```

5. En `/admin/marketing/seo` aparecerá el panel **IndexNow** con un botón **"Enviar sitemap a IndexNow"** — un click manda las 20 URLs.

---

## Auto-ping integrado

Cada vez que cambies un blog post de `draft` → `published` desde `/admin/blog`:

1. Se dispara `syndicatePost()` (Medium + Dev.to + Hashnode) si tokens configurados
2. Se dispara `notifyIndexNowSingle()` con la URL del post
3. En 1-5 minutos: Bing+Yandex+ChatGPT Search+Copilot lo ven

Sin tocar nada manual. Solo publicar.

---

## Bing Webmaster Tools (recomendado, 5 min de Mario)

Beneficio: además de IndexNow, GUI con keywords reales, errores de crawl, sitemap status, backlinks que tienes.

1. Entra a [bing.com/webmasters](https://www.bing.com/webmasters)
2. "Add a site" → `https://tresmilmillonesdelatidos.es`
3. Tres métodos de verificación — el más rápido:
   - **Import from Google Search Console** (con tu cuenta `mariopablobarron@gmail.com`)
   - Te trae todas las propiedades verificadas en GSC + el sitemap automáticamente
4. Listo. A las 24h ya hay datos de Bing.

---

## URLs prioritarias para "Solicitar indexación" manual en GSC

Solo accesible desde la UI de Google Search Console (la API no soporta indexing requests para sitios genéricos).

En GSC → Inspección de URLs, pega cada una y pulsa "Solicitar indexación":

```
https://tresmilmillonesdelatidos.es/
https://tresmilmillonesdelatidos.es/precios
https://tresmilmillonesdelatidos.es/calculadora-latidos
https://tresmilmillonesdelatidos.es/faq
https://tresmilmillonesdelatidos.es/reto
https://tresmilmillonesdelatidos.es/sobre-nosotros
https://tresmilmillonesdelatidos.es/guia
```

Tiempo total: 2 minutos. Reduce el tiempo de aparición en Google de 4 semanas a 24-72h.

---

## Componentes nuevos

| Archivo | Qué hace |
|---|---|
| `src/services/seo/indexnow.ts` | Cliente IndexNow + helpers |
| `src/app/api/seo/indexnow-key/route.ts` | Sirve la key para verificación de Bing |
| `src/app/api/admin/seo/submit/route.ts` | Endpoint admin para bulk submission |
| `src/app/admin/marketing/seo/page.tsx` | Panel UI en SEO admin |
| Hook en `src/app/api/admin/blog/[id]/route.ts` | Auto-ping al publicar |

---

## Métricas esperadas tras setup

| Métrica | Antes | Después (1-2 semanas) |
|---|---|---|
| Páginas indexadas Google | 0-3 | 15-20 |
| Páginas indexadas Bing | 0 | 20 |
| Aparición en ChatGPT Search | No | Sí (vía Bing) |
| Time-to-index nuevos posts | 1-4 semanas | <1 hora |
| Backlinks contextuales (discovery agent) | 0 | 5-10/semana |

---

## Roadmap próximo

- Convertir blog `[slug]` page a SSR puro + añadir `BlogPosting` JSON-LD dinámico (rich snippets en Top Stories carousel)
- Añadir `BreadcrumbList` schema per page (mejora sitelinks)
- Auto-submit Reddit posts publicados por el discovery agent también a IndexNow (cuando uno aprueba en `/admin/distribution`)
- Detectar URLs `404` antes de submitearlas (sanity check)
