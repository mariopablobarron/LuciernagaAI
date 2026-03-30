# Explore Feature - Documentación

## Estructura

Esta experiencia transforma la home de Luciernaga AI en una interfaz de exploración moderna e inmersiva, centrada en el usuario y sus acciones.

### Páginas

- **`/app/explore/page.tsx`** - Página principal que gestiona el estado global de la exploración

### Componentes

#### 1. `ExploreCanvas.tsx`
El lienzo principal que:
- Calcula posiciones circulares para los nodos de acción
- Dibuja líneas SVG conectando al usuario central
- Gestiona la selección y visualización de nodos
- Muestra un gradiente dinámico según el estado emocional
- Maneja la lógica de completación de acciones

#### 2. `ActionNode.tsx`
Nodo individual de acción que:
- Muestra un ícono y color emocional
- Se anima al hover y cuando está activo
- Muestra tooltips con título y descripción
- Pulsa cuando está seleccionado

#### 3. `UserCore.tsx`
Nodo central del usuario que:
- Muestra el estado emocional actual
- Dibuja un anillo de progreso
- Anima rotaciones en ambas direcciones
- Muestra el conteo de acciones completadas

#### 4. `ActionModal.tsx`
Modal de interacción que:
- Abre cuando se hace click en un nodo
- Solicita entrada del usuario
- Muestra texto motivacional personalizado
- Simula guardado de la acción

#### 5. `ProgressIndicator.tsx`
Indicador de progreso que:
- Muestra el porcentaje de acciones completadas
- Usa un gradiente visual de duda a claridad
- Actualiza en tiempo real

## Características

### Visual
- ✨ Gradientes dinámicos según estado emocional
- 🎯 Disposición circular y armónica
- ⚡ Animaciones suaves y fluidas
- 🎨 Colores emocionales coherentes
- 📱 Totalmente responsive

### Interacción
- 🖱️ Click en nodos abre modal de acción
- ✅ Completar acción hace desaparecer el nodo
- 🔄 Reset permite comenzar nuevo ciclo
- 🎯 UX inmediata y clara

### Acciones Predefinidas
1. **Escribe lo que evitas** - Nombra lo no dicho
2. **Definir siguiente paso** - Qué sigue después
3. **Cerrar tarea pendiente** - Libérate de lo pendiente
4. **Explorar patrón recurrente** - Identifica repeticiones
5. **Reconocer avance** - Celebra logros

## Colores Emocionales

Se utilizan las variables CSS ya definidas en el proyecto:
- `--emotion-blocked`: Para bloqueos
- `--emotion-anxious`: Para ansiedad
- `--emotion-doubt`: Para dudas (azul)
- `--emotion-clarity`: Para claridad (verde)

## Responsividad

El radio de la disposición circular se adapta automáticamente:
```typescript
radius = Math.min(containerSize.width, containerSize.height) * 0.25
```

## Estado

La aplicación mantiene:
- Array de acciones (completadas o pendientes)
- Estado emocional actual del usuario
- ID del nodo activo
- Estado de carga

## Texto Inicial

Cuando el usuario abre la página por primera vez:
> "Empieza por lo que más te cuesta decir.
> No necesitas tenerlo claro."

## Expansión Futura

Puntos de extensión:
- Integrar con API para guardar acciones
- Agregar más acciones dinámicamente
- Guardar historial de completaciones
- Análisis de patrones emocionales
- Recomendaciones personalizadas
