# Manual para Organizaciones — Tres Mil Millones de Latidos

**Version:** 1.0
**Fecha:** 7 de abril de 2026
**Audiencia:** Responsables de HR, psicologos y terapeutas de centros que usan la plataforma

---

## 1. Que es el portal organizacional

El portal organizacional permite a tu centro, clinica o empresa acceder a datos agregados de bienestar de las personas que usan Tres Mil Millones de Latidos dentro de tu organizacion.

Hay dos roles:

| Rol | Que ve | Ruta |
|---|---|---|
| **HR / Responsable** | Dashboard con metricas anonimizadas y agregadas | `/org/dashboard` |
| **Psicologo / Terapeuta** | Lista de pacientes con indicadores clinicos | `/org/patients` |

---

## 2. Como acceder

1. Entra en la web y ve a `/org/login`
2. Introduce los tres campos:
   - **Organizacion:** el identificador de tu centro (ej. `demo-corp`)
   - **Email:** tu email profesional
   - **Contrasena:** la que te proporciono el administrador del sistema
3. Pulsa "Entrar"

Si no tienes credenciales, solicitalas al responsable tecnico de tu organizacion.

---

## 3. Dashboard de bienestar (rol HR)

Al entrar como HR ves un dashboard con datos **anonimizados y agregados**. Ningun dato individual es visible.

### Metricas principales

| Metrica | Que significa |
|---|---|
| **Usuarios activos** | Personas que han usado la plataforma |
| **Retencion 7d** | Porcentaje que sigue activo tras 7 dias |
| **Media racha** | Promedio de dias consecutivos de check-in |
| **Mensajes/usuario** | Media de mensajes enviados por persona |

### Distribucion de estados

Grafico con el porcentaje de personas en cada estado emocional:

| Estado | Significado |
|---|---|
| **Claridad** | Se sienten enfocados y con energia |
| **Neutral** | Estado base, sin senales destacables |
| **Duda** | Incertidumbre o falta de direccion |
| **Bloqueo** | Paralisis o incapacidad de avanzar |
| **Ansiedad** | Presion, estres o preocupacion elevada |

### Emociones predominantes

Muestra las emociones mas frecuentes detectadas en las conversaciones del equipo.

### Otros indicadores

- **Metas completadas:** porcentaje de objetivos marcados como completados
- **Activos (30 dias):** personas que han interactuado en el ultimo mes
- **Eventos de crisis (30d):** numero de situaciones de alto riesgo detectadas

### Privacidad

- Los datos solo se muestran si hay al menos **5 usuarios activos** en la organizacion
- No se exponen nombres, emails ni contenido de conversaciones
- Todos los datos son agregados estadisticamente

---

## 4. Lista de pacientes (rol terapeuta)

Al entrar como terapeuta ves una lista de las personas asignadas a tu organizacion con indicadores clinicos.

### Que ves por cada paciente

| Campo | Descripcion |
|---|---|
| **Nombre** | Nombre o identificador anonimo (ej. "Paciente a3f2") |
| **Flag de riesgo** | Verde (bien), amarillo (atencion), rojo (crisis) |
| **Dias sin actividad** | Cuantos dias lleva sin usar la plataforma |
| **Estado emocional** | Estado actual: claridad, neutral, duda, bloqueo, ansiedad |
| **Emocion primaria** | Emocion dominante detectada |
| **Patron dominante** | Patron de comportamiento recurrente |
| **Tendencia** | Si esta mejorando, estable o empeorando |
| **Nivel de riesgo** | low, medium, high, critical |
| **Crisis activa** | Si tiene una crisis activa en este momento |
| **Racha** | Dias consecutivos de check-in (actual y mejor) |
| **Objetivo activo** | Titulo del objetivo actual y porcentaje de progreso |
| **Ultimo evento de evitacion** | Si ha postergado o evitado acciones recientemente |

### Como interpretar los flags de riesgo

| Color | Significado | Accion sugerida |
|---|---|---|
| Verde | Sin senales de alarma | Seguimiento habitual |
| Amarillo | Riesgo medio, inactividad de 3+ dias o patron negativo | Revisar y valorar contacto |
| Rojo | Crisis activa detectada por el sistema | Intervencion prioritaria |

### Que NO ves como terapeuta

- Contenido de las conversaciones de chat
- Datos personales mas alla del nombre mostrado
- Email o datos de contacto directo

El terapeuta ve un resumen clinico, no el detalle de las sesiones.

---

## 5. Interpretacion de estados emocionales

El sistema detecta automaticamente el estado emocional de cada persona en base a sus conversaciones y check-ins.

### Los 5 estados

| Estado | Senales tipicas | Que hacer |
|---|---|---|
| **Claridad** | Energia, enfoque, progreso | Reforzar y acompanar |
| **Neutral** | Sin senales destacables | Observar, mantener rutina |
| **Duda** | Incertidumbre, preguntas, indecision | Ayudar a ordenar opciones |
| **Bloqueo** | Paralisis, "no puedo", postergar | Fraccionar en pasos pequenos |
| **Ansiedad** | Presion, urgencia, rumiacion | Contener, bajar exigencia, priorizar |

### Niveles de riesgo

| Nivel | Que indica |
|---|---|
| `low` | Sin alarmas |
| `medium` | Patron de evitacion o estado negativo sostenido |
| `high` | Crisis recientes o ansiedad persistente |
| `critical` | Crisis activa — requiere atencion inmediata |

---

## 6. Protocolo de crisis

Cuando el sistema detecta una situacion de alto riesgo emocional (palabras clave de riesgo vital):

1. Activa un modo de contencion para el usuario
2. Le muestra el telefono **024** (linea de atencion a la conducta suicida en Espana)
3. Registra un evento de crisis con nivel y fragmento del mensaje
4. Notifica al administrador del sistema por Telegram
5. Si el usuario tiene una persona de confianza configurada, puede alertarla

Como terapeuta, los pacientes con crisis activa aparecen marcados en **rojo** en tu lista.

**Importante:** La plataforma no reemplaza atencion psicologica profesional. Es una herramienta de apoyo y deteccion temprana.

---

## 7. Buenas practicas para centros

### Para HR

- Revisa el dashboard al menos una vez por semana
- Presta atencion a cambios bruscos en la distribucion de estados
- Si los eventos de crisis suben, coordina con el equipo clinico
- Usa los datos agregados para informar decisiones de bienestar organizacional

### Para terapeutas

- Revisa la lista de pacientes al inicio de cada jornada
- Prioriza los flags rojos y amarillos
- Observa patrones: si un paciente lleva 3+ dias sin actividad, puede necesitar seguimiento
- Los patrones de evitacion repetidos (posterga acciones) suelen indicar bloqueo subyacente
- Coordina con el administrador del sistema si necesitas intervenir directamente

---

## 8. Preguntas frecuentes

### Puedo ver las conversaciones de chat de mis pacientes?

No. El terapeuta ve un resumen clinico (estado, riesgo, racha, objetivos) pero nunca el contenido de las conversaciones. Esto protege la privacidad del usuario.

### Los datos del dashboard son en tiempo real?

Se calculan al momento de cargar la pagina. Puedes recargar para obtener los datos mas recientes.

### Que pasa si hay menos de 5 usuarios?

El dashboard de HR no muestra datos — aparece un aviso de privacidad. Esto evita que se puedan identificar personas individuales a traves de datos agregados.

### Puedo enviar mensajes a los pacientes desde el portal?

No desde el portal organizacional. Las intervenciones directas se hacen desde el panel clinico del administrador (`/admin-clinical`). Solicita acceso al administrador si lo necesitas.

### Como se anaden nuevos pacientes a mi organizacion?

Los usuarios se asignan a una organizacion desde la base de datos. Coordina con el equipo tecnico para anadir nuevos miembros.

### Puedo exportar los datos del dashboard?

Actualmente no hay boton de exportacion en el portal. Coordina con el administrador para obtener reportes.

---

## 9. Soporte

Si tienes problemas con el acceso o necesitas asistencia:

- Contacta al responsable tecnico de tu organizacion
- Incluye: que intentabas hacer, que error aparece, fecha y hora

---

Documento: Manual para Organizaciones
Producto: Tres Mil Millones de Latidos
Version: v1.0
Fecha: 7 de abril de 2026
