# Diseño "age-aware" — Tres Mil Millones de Latidos

Spec del comportamiento del producto en función del rango etario auto-declarado por el usuario. Incluye cumplimiento legal (RGPD + LOPDGDD), adaptación de coach, protocolo de crisis y restricciones de funcionalidades.

> Estado: Fase 1 implementada (schema + helper + recursos crisis menores ES). Fases 2-5 pendientes.

---

## 1. Por qué

El producto está abierto a cualquier persona que entre. Eso crea tres problemas:

1. **Legal.** Procesar datos personales de menores de 14 años sin consentimiento parental verificable expone a multa LOPDGDD (España) y RGPD (UE). Las conversaciones con un coach emocional son datos especialmente sensibles.
2. **Seguridad clínica.** Adolescentes en crisis necesitan recursos distintos a los de adultos (ANAR vs 024). Mayores con deterioro cognitivo necesitan disclaimer reforzado de "esto no es terapia profesional".
3. **Calidad del producto.** El tono del coach actual (adulto medio reflexivo) suena postizo a un adolescente y paternalista a alguien de 70.

## 2. Decisiones tomadas

| Decisión | Valor |
|----------|-------|
| Público objetivo | 18+ por defecto, 14-17 con flujo adaptado |
| Edad mínima | 14 años (LOPDGDD ES) |
| Recogida | Declaración propia, no verificable |
| Granularidad | Rango (5 buckets), no edad exacta |
| Almacenamiento | `User.ageRange` opcional, anonymous-first sigue intacto |
| Verificación parental | No (no es factible online y queda fuera del scope inicial) |

## 3. Rangos definidos

| Rango | Edad | Tier | Uso principal |
|-------|------|------|---------------|
| `under_14` | <14 | (bloqueado) | Pantalla de redirección a recursos para menores. NO se crea fila User. |
| `14_17` | 14-17 | minor | Coach con tono directo, recursos de crisis específicos (ANAR), sin mezcla en círculos con adultos. |
| `18_29` | 18-29 | adult | Default. |
| `30_49` | 30-49 | adult | Default. |
| `50_69` | 50-69 | adult | Default + opción accesibilidad si el usuario lo activa. |
| `70_plus` | 70+ | elder | Tipografía más grande, vocabulario más claro, disclaimer reforzado. |

Tipos en TypeScript: `src/lib/age-range.ts` (`AgeRange`, `AgeBucket`, `AgeTier`).

## 4. Fases de implementación

### Fase 1 — Base (HECHO)

- ✅ Migración `User.ageRange String?` (aditiva, nullable, no destructiva).
- ✅ Helper `src/lib/age-range.ts` con tipos, validación, etiquetas en español, mapeo edad→rango y rango→tier.
- ✅ Recursos de crisis para menores en España (ANAR) en `src/lib/crisis-hotlines.ts` vía `getAudienceHotlines(country)`.
- ✅ Tests unitarios del helper.

### Fase 2 — Pantalla de declaración (PENDIENTE — requiere decisión de UX)

Pantalla previa al chat. Aparece la primera vez que el usuario llega y mientras `User.ageRange` sea null (o en sesión anónima, mientras la cookie no la tenga).

Diseño propuesto:
- Título: "Antes de empezar"
- Texto: "Para hablarte de la forma adecuada, ¿en qué franja de edad estás?"
- Opciones (botones grandes): Menos de 14 · 14-17 · 18-29 · 30-49 · 50-69 · 70+
- Aviso legal pequeño: "Al continuar declaras que la edad indicada es correcta. Si tienes 14-17, recomendamos hablarlo con un adulto de confianza."

Comportamiento:
- `under_14`: pantalla de redirección con texto adaptado + ANAR. Sin acceso al chat.
- `14_17`: continúa al chat con flag de tier=minor.
- Resto: continúa normal.

Persistencia:
- Usuario logueado: escribir `User.ageRange`.
- Anónimo: cookie `mentor_age_range` (httpOnly=false porque la lee el cliente, sameSite=lax, 1 año).

### Fase 3 — Adaptación del coach (PENDIENTE)

Modificar `buildCoachPrompt` (o equivalente en `src/services/coach.ts`) para inyectar una sección `<audience>...</audience>` al system prompt según el tier.

- `minor`: tono directo, frases cortas, sin metáforas excesivas, sin paternalismo. Mencionar adulto de confianza cuando salga el tema del entorno familiar/escolar. NO recomendar mantener secretos importantes con la familia.
- `adult`: lo que hay hoy.
- `elder`: vocabulario plano (en lugar de "límites tóxicos" usar "personas que te hacen daño"), referencias generacionales propias, respeto explícito por la trayectoria de vida.

### Fase 4 — Restricciones funcionales

- **Círculos** (`src/services/circleMatchmaking.ts`): añadir filtro `tier` al matchmaking. No agrupar `minor` con `adult` ni `elder`.
- **Comunidad anónima**: marcar mensajes de `minor` con flag interno para moderación más estricta. No visible al usuario.
- **Cápsulas a futuro**: misma persona, sin restricción.

### Fase 5 — Accesibilidad para 70+

- Variable de tema `large-text` activable desde ajustes para `70_plus`.
- Tipografías base 18px → 20px en cuerpo, botones más altos, contraste sutilmente mayor.
- Probarlo con un usuario real antes de hacerlo opt-in automático.

## 5. Tabla de protocolo de crisis por tier

| Señal | adult / elder | minor |
|-------|---------------|-------|
| Ideación suicida explícita | 024 + emergencias 112 | ANAR 900 20 20 10 + 024 + emergencias 112 + sugerir adulto de confianza |
| Acoso / maltrato | derivar a recursos generales | ANAR + sugerir profesor o servicios sociales |
| Aislamiento severo | recursos para soledad | ANAR + servicios escolares |

Implementación: extender `src/services/coach.ts` o el módulo de crisis para consumir `getAudienceHotlines()` cuando `tier === "minor"`.

## 6. Cumplimiento RGPD + LOPDGDD

- **Bloqueo <14:** declaración + cierre de sesión + redirección. Sin almacenar datos del menor.
- **14-17:** se acepta declaración. NO se exige consentimiento parental verificable (sería bloqueante en la práctica). Esto es coherente con cómo lo hacen plataformas comparables (no es ideal pero es defendible). Si el proyecto crece y se profesionaliza, considerar Veriff o Onfido para verificación.
- **18+:** sin restricciones adicionales por edad.

> Disclaimer al usuario en la pantalla de declaración: "Al continuar declaras tener la edad indicada. Si la información es falsa, asumes la responsabilidad."

## 7. Métricas a monitorizar

- Distribución de rango etario en `/admin/analytics` (extender el endpoint usage-snapshot con un breakdown).
- Tasa de drop-off en la pantalla de declaración.
- Crisis events por tier — si hay overrepresentación de `minor`, alertar al admin para revisar el flujo.

## 8. Reversibilidad

Toda la spec es reversible:
- Migración aditiva nullable. Rollback = `ALTER TABLE "User" DROP COLUMN "ageRange"`.
- Pantalla de declaración: si se quita, el campo sigue null y todo funciona.
- Adaptación coach: condicional. Si se desactiva, vuelve al prompt único.
- Restricciones círculos: condicional. Si se desactiva, mezcla normal.

## 9. Pendiente de decisión por el equipo

- Color exacto y wording de la pantalla de declaración.
- Si la elección guardada se puede cambiar después (sí, en ajustes; ¿con cooldown para evitar abuso?).
- Si los menores tienen acceso a community/cápsulas o solo al chat individual.
