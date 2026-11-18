# Felencho Mundial — Estudio de Guiones y Teleprompter (laboratorio V1)

**Decisión de marca (17 nov 2026):** todas las interfaces, títulos, documentos y nuevas rutas se presentan bajo **Felencho**. La aplicación del iPad se llama **Felencho Teleprompter** y pertenece a **Felencho Estudio de Guiones**, bajo **Felencho Director**. El iPad es solo la pantalla; el software será propio, no BestView.

**Compatibilidad técnica transitoria:** algunos nombres internos heredados como `lumina_scripts`, `lumina_scene_lines`, `lumina_script_scenes` y antiguas APIs permanecen temporalmente para leer los guiones existentes. **No significa conservar la marca anterior.** Renombrar tablas y rutas requiere migración controlada, pruebas de regresión y rollback; no hacerlo como sustitución textual.

**Estado:** código en GitHub; no instalado ni verificado en La Bestia. Servicios de voz, Studio Control y LiveKit intactos.

**Funciones:** guion de presentador, espejo, letra, velocidad, pausa, guardado local en navegador, solicitud de guion por ID con token de laboratorio, lectura de la fuente de datos existente sin exponer las líneas de Bob ni Lina. No hay aún sincronización validada con el Director ni iPad.

**Seguridad:** la consulta de guiones está cerrada por defecto y requiere `FELENCHO_TELEPROMPTER_TOKEN` en el servidor. No desplegar ni exponer públicamente; el token en HTTP local requiere mayor protección antes de guiones reales. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY`.

**Problema heredado pendiente:** el productor antiguo consulta `lumina_script_lines` aunque el generador escribe `lumina_scene_lines`. El panel usa un `script_id` fijo. Planificar migración con nombres Felencho sin cambiar aún los datos.

**Próximos pasos:** verificar build, probar aislamiento, definir acceso local seguro, probar en iPad y después integrar selección de guion y avance del Director. No depende de ninguna aplicación BestView.

## Etapa V2 — lectura manual / recuperación (17 nov 2026)
- **Comprobación por Felencho en hardware:** aplicación V1 abre desde Safari en iPad Pro 12.9 (2.ª gen) y el mando BestView desplaza texto manualmente. Chrome mostró una advertencia de hidratación con atributo añadido por componente de navegador; Safari funcionó.
- **Código V2:** `app/teleprompter-lab/page.tsx` elimina play/velocidad, preserva flechas y PageUp/PageDown, guarda guion, letra, espejo y `scrollTop` en localStorage (clave v2, lee v1 como respaldo); no reenvía audio ni activa parlantes.
- **No probado todavía:** compilación V2 en La Bestia, restauración Safari tras recarga, uso prolongado de BestView, integración de Felencho Director.
- **Arranque V2 opcional:** paquete separado ZIP, instala LaunchAgent `ai.felencho.teleprompter.lab` en usuario macOS para mantener un servicio Next.js en 3107 y crea respaldo de la página original. Rechaza ocupar puertos ajenos, detiene solo Next.js del laboratorio tras comprobar dueño del PID/cwd. Incluye script de reversión. No ejecutado por el asistente en La Bestia.
- **Seguridad:** el servidor HTTP local en IP privada no ofrece confidencialidad ni control de acceso a la página. Únicamente guion de demostración hasta construir un canal autenticado y cifrado; el token de la API de guiones no autoriza publicar libremente la interfaz.
- **Continuidad:** cambiar IP de Wi-Fi puede requerir reiniciar el agente dedicado. Safari puede borrar el almacenamiento local; no prometer recuperación ante fallo del iPad o limpieza de datos. Nunca conectar voces automáticamente ni ordenar intervenciones por una línea de guion.
