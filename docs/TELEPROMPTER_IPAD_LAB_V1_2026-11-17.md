# Felencho Mundial — Estudio de Guiones y Teleprompter (laboratorio V1)

**Decisión de marca (17 nov 2026):** todas las interfaces, títulos, documentos y nuevas rutas se presentan bajo **Felencho**. La aplicación del iPad se llama **Felencho Teleprompter** y pertenece a **Felencho Estudio de Guiones**, bajo **Felencho Director**. El iPad es solo la pantalla; el software será propio, no BestView.

**Compatibilidad técnica transitoria:** algunos nombres internos heredados como `lumina_scripts`, `lumina_scene_lines`, `lumina_script_scenes` y antiguas APIs permanecen temporalmente para leer los guiones existentes. **No significa conservar la marca anterior.** Renombrar tablas y rutas requiere migración controlada, pruebas de regresión y rollback; no hacerlo como sustitución textual.

**Estado:** código en GitHub; no instalado ni verificado en La Bestia. Servicios de voz, Studio Control y LiveKit intactos.

**Funciones:** guion de presentador, espejo, letra, velocidad, pausa, guardado local en navegador, solicitud de guion por ID con token de laboratorio, lectura de la fuente de datos existente sin exponer las líneas de Bob ni Lina. No hay aún sincronización validada con el Director ni iPad.

**Seguridad:** la consulta de guiones está cerrada por defecto y requiere `FELENCHO_TELEPROMPTER_TOKEN` en el servidor. No desplegar ni exponer públicamente; el token en HTTP local requiere mayor protección antes de guiones reales. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY`.

**Problema heredado pendiente:** el productor antiguo consulta `lumina_script_lines` aunque el generador escribe `lumina_scene_lines`. El panel usa un `script_id` fijo. Planificar migración con nombres Felencho sin cambiar aún los datos.

**Próximos pasos:** verificar build, probar aislamiento, definir acceso local seguro, probar en iPad y después integrar selección de guion y avance del Director. No depende de ninguna aplicación BestView.
