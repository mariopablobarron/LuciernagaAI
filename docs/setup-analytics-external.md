# Setup — Analytics externos (GA4 · Search Console · Metricool)

Este documento describe los pasos manuales para activar el dashboard `/admin/analytics/external` que mezcla:

- Google Analytics 4 (Data API)
- Google Search Console (Search Analytics)
- Metricool (redes sociales)

El código y la UI ya están listos. Lo único pendiente es configurar credenciales en Coolify.

---

## Variables de entorno que hay que añadir en Coolify

```
GOOGLE_SERVICE_ACCOUNT_JSON_B64=<base64 del JSON del Service Account>
GA4_PROPERTY_ID=<ID numérico de la propiedad GA4>
GSC_SITE_URL=https://tresmilmillonesdelatidos.es/

METRICOOL_USER_ID=<numérico>
METRICOOL_USER_TOKEN=<token largo>
METRICOOL_BLOG_ID=<numérico>
```

> Si solo configuras Google y dejas Metricool en blanco (o al revés), el dashboard funciona igual: el panel de la fuente sin configurar muestra "no configurado" con la lista de variables que faltan.

---

## Parte A — Google (GA4 + Search Console)

Las dos APIs comparten un mismo Service Account. Lo creas una vez y luego le das permisos en cada propiedad.

### A.1 — Crear Service Account en Google Cloud Console

1. Entra en [console.cloud.google.com](https://console.cloud.google.com).
2. Si no tienes proyecto, crea uno (nombre sugerido: `tresmilmillonesdelatidos`).
3. Menú lateral → **APIs & Services** → **Library**.
4. Busca y habilita estas dos APIs:
   - "Google Analytics Data API"
   - "Google Search Console API"
5. Menú lateral → **IAM & Admin** → **Service Accounts** → **Create Service Account**.
   - Nombre: `mentor-web-analytics`
   - Description: "Read-only para dashboard admin de analítica"
   - **Sin roles** (no necesita roles a nivel proyecto, los permisos son a nivel de propiedad GA4 / sitio Search Console).
6. Clic en el Service Account creado → pestaña **Keys** → **Add Key** → **Create new key** → JSON → Create.
7. Te descarga un fichero `xxxx.json`. **Guárdalo seguro.** El `client_email` que verás dentro es el que vas a añadir como Viewer en GA4 y en Search Console.

### A.2 — Convertir el JSON a base64

En tu terminal local:

```bash
cat ~/Downloads/xxxx.json | base64 | tr -d '\n' > /tmp/service-account.b64
cat /tmp/service-account.b64
# Copia ese string completo, esa es la variable GOOGLE_SERVICE_ACCOUNT_JSON_B64
```

> Razón del base64: la `private_key` del JSON tiene saltos de línea y caracteres que rompen una env var multilínea en Coolify. Base64 lo aplana.

### A.3 — Conseguir GA4_PROPERTY_ID

1. Entra en [analytics.google.com](https://analytics.google.com).
2. Si no tienes propiedad para `tresmilmillonesdelatidos.es`, créala (Admin → Create property).
3. Una vez dentro de la propiedad: **Admin** → **Property Settings** → arriba ves "Property ID: 123456789".
4. Ese número es `GA4_PROPERTY_ID`.

### A.4 — Dar acceso al Service Account en GA4

1. Mismo panel de Admin de la propiedad → **Property Access Management**.
2. **+ → Add users**.
3. Email: pega el `client_email` del JSON (algo como `mentor-web-analytics@tu-proyecto.iam.gserviceaccount.com`).
4. Role: **Viewer** (es suficiente, no necesita más).
5. Guarda.

### A.5 — Dar acceso al Service Account en Search Console

1. Entra en [search.google.com/search-console](https://search.google.com/search-console).
2. Asegúrate de que tu dominio `tresmilmillonesdelatidos.es` está verificado como propiedad. Si no, sigue el wizard (DNS TXT o subir archivo HTML).
3. Selecciona la propiedad → **Settings** → **Users and permissions** → **Add user**.
4. Email: pega el mismo `client_email` del JSON.
5. Permission: **Restricted** (es lo mínimo y es suficiente para read-only).

### A.6 — `GSC_SITE_URL`

Depende de cómo verificaste la propiedad:

- Si verificaste **dominio entero** (DNS): `sc-domain:tresmilmillonesdelatidos.es`
- Si verificaste **prefijo URL** (HTML/meta): `https://tresmilmillonesdelatidos.es/` (con la barra final)

Pruébalo: si tras configurar todo el dashboard responde "0 clicks 0 impresiones" pero la propiedad sí tiene datos en search.google.com, lo más probable es que esté equivocado.

---

## Parte B — Metricool

> Pre-requisito: plan **Advanced** o **Premium** de Metricool. La API no está disponible en planes gratuitos / Lite.

### B.1 — `METRICOOL_USER_ID` y `METRICOOL_USER_TOKEN`

1. Entra en [app.metricool.com](https://app.metricool.com).
2. Avatar arriba a la derecha → **Mi cuenta** → **API**.
3. Verás `User ID` (numérico) y `User token` (string largo).

### B.2 — `METRICOOL_BLOG_ID`

Cada "marca" o cuenta vinculada en Metricool es un "blog". Cada uno tiene un ID numérico.

1. Entra en la marca para la que quieres ver métricas.
2. Mira la URL: `https://app.metricool.com/?blog=12345&...` → ese `12345` es `METRICOOL_BLOG_ID`.

> Si tienes varias marcas, decide cuál es la principal o lo parametrizamos en otro paso.

---

## Parte C — Pegar variables en Coolify y redeploy

1. Coolify → tu app `mentor-web` → **Environment Variables**.
2. Añade las 6 variables (Google + Metricool).
3. **Save**.
4. **Force Redeploy**.

---

## Parte D — Validación

Tras el redeploy, prueba:

```bash
# Acceso autenticado por CRON_SECRET (alias para validar sin admin login)
curl -s "https://tresmilmillonesdelatidos.es/api/admin/analytics-external?secret=$CRON_SECRET" | jq '.providers | to_entries[] | {provider: .key, configured: .value.configured, ok: .value.data.ok}'
```

Esperado:
```json
{ "provider": "ga4", "configured": true, "ok": true }
{ "provider": "searchConsole", "configured": true, "ok": true }
{ "provider": "metricool", "configured": true, "ok": true }
```

Si `configured: true` pero `ok: false`, mira el campo `error` para diagnosticar (el más común: el Service Account no se ha añadido como Viewer en la propiedad correcta).

Después: entra en `/admin/analytics` y pulsa el botón cyan **Web & Redes**. Ahí lo ves bonito.

---

## Troubleshooting rápido

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| GA4 dice "no configurado" | Falta variable | Verifica las 2 envs en Coolify y redeploy |
| GA4 ok pero todo a 0 | Service Account sin acceso | A.4 — añadir como Viewer en GA4 |
| GA4 error 403 PERMISSION_DENIED | API no habilitada en el proyecto cloud | A.1 paso 4 — habilitar Google Analytics Data API |
| GSC error 403 | Mismo motivo | A.5 — añadir email en Users del sitio |
| GSC `unknown error` con prefijo URL | URL mal escrita | A.6 — usar `sc-domain:` o el prefijo exacto con `/` |
| Metricool todo a 0 | Plan free | Subir a Advanced / Premium |
| Metricool error 401 | Token caducado | Regenera en B.1 |

---

## Coste recurrente

- **Google APIs**: gratis (cuotas más que suficientes para una sola app).
- **Metricool**: requiere plan de pago (~50 €/mes mínimo para acceso API).
- **Looker Studio** (alternativa que no usamos aquí pero queda como opción futura): gratis para Google APIs, conector Metricool ~10 €/mes.

---

## Próximos pasos (opcionales, no urgentes)

- **Cache server-side** para evitar quemar cuotas — actualmente cada visita a la página llama a las 3 APIs en paralelo. Si lo accedes mucho, conviene cachear 15 min.
- **Snapshot diario** persistente (`UsageSnapshot` table) para histórico mensual sin depender de las APIs externas.
- **Alertas** cuando un KPI cruza umbral (ej. impresiones GSC caen 30% vs semana anterior).
