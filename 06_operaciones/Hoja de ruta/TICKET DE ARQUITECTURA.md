# 📋 TICKET DE ARQUITECTURA: Refactorización Core y Offline-First

**Contexto del Módulo:** Se requiere implementar tolerancia a fallos de red (Offline-First) en las salidas de DRP y eliminar la latencia visual (Optimistic UI) en la gestión de colas de Filiación, respetando la infraestructura TanStack Query del proyecto.
**Restricciones estrictas:** Prohibido usar `await supabase.rpc()` directamente en componentes visuales para mutaciones críticas. Prohibido usar estados locales (`useState`) para datos que deban tener Optimistic UI sin un caché de TanStack Query de respaldo.

A continuación, los diagnósticos y soluciones algorítmicas que debes implementar:

### 🛠 TAREA 1: Optimistic UI en reordenamiento de pacientes

**Archivo/Página:** `src/hooks/useFiliacion.ts`
**Bloque/Función:** Modificación del estado principal y nueva mutación para reordenar.
**Línea(s):** Global (Hook completo).
**Diagnóstico:** El arrastre (Drag & Drop) de pacientes en boxes no puede depender de la latencia de red. Actualmente el estado se maneja en un `useState` hidratado por Realtime, lo que provoca condiciones de carrera y "jank" visual al reordenar.
**Solución Estratégica:** 1. **Delegación de Caché:** Evaluar la migración de `pacientes` del `useState` actual hacia el caché de `useQuery` de TanStack Query para facilitar la mutación optimista, o en su defecto, preparar la función de reordenamiento para mutar el array local.
2. **Implementar `useMutation`:** Crea una función de mutación (ej. `reordenarPacientes`) usando TanStack Query que apunte al RPC correspondiente en base de datos.
3. **Algoritmo de Optimistic UI:**

- En `onMutate`: Ejecuta `queryClient.cancelQueries` para evitar colisiones. Guarda el estado actual de la cola (snapshot). Actualiza inmediatamente el estado local/caché con el nuevo orden de pacientes (interfaz instantánea).
- En `onError`: Si el RPC falla (ej. red caída o colisión), restaura automáticamente el estado utilizando el snapshot previo.
- En `onSettled`: Dispara un `queryClient.invalidateQueries` para forzar a la UI a resincronizarse con la verdad absoluta del servidor.

---

### 🛠 TAREA 2: Encolamiento Local Offline para Salida de DRP

**Archivo/Página:** `src/hooks/useDrp.ts` (O el hook encargado de gestionar las acciones de estado del DRP).
**Bloque/Función:** Función/Acción de "Salir del DRP" (`salirDrp` o equivalente).
**Línea(s):** Nueva implementación.
**Diagnóstico:** Si la ambulancia pierde cobertura temporalmente y pulsan "Salir del DRP", una llamada estándar asíncrona fallará y el timestamp de salida real se perderá, desincronizando la auditoría de RRHH y Operativa.
**Solución Estratégica:**

1. **Reemplazo de API:** Queda estrictamente prohibido invocar `supabase.rpc('rpc_salir_drp')` (o su equivalente) de forma directa.
2. **Implementación de Arquitectura v2:** Debes importar e implementar obligatoriamente el hook `useOfflineMutation` expuesto en `src/hooks/useOfflineMutation.ts`.
3. **Interfaces I/O esperadas:**
   - Configura las options del hook: `rpcName: 'nombre_de_tu_rpc_de_salida'`.
   - Configura la invalidación: `invalidates: [['drp_activo']]` (para que `useDrpActivo.ts` revalúe el estado si hay red).
4. **Manejo de UI (Opcional pero requerido):** El componente que consume esta mutación debe evaluar la respuesta. Si el resultado es `queued: true`, se debe lanzar un aviso en la UI (Toast) indicando que la operación se ha encolado localmente por falta de conexión.
