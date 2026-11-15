# FELENCHO MUNDIAL — continuidad, respaldo y restauración (15-11-2026)

Estado: **procedimiento preparado, no ejecutado ni validado en La Bestia**. No asumir que existe una copia restaurable hasta pasar el ensayo en una segunda Mac.

## Alcance y límites
- Equipo primario: La Bestia (MacBook Pro M4 Max).
- Centro de mando permanente: Studio Control `http://127.0.0.1:7892`.
- Servicios a recuperar: Realtime Lab 3002; Qwen3-TTS 7894; Whisper; transporte de audio hacia RØDECaster Pro II.
- Branch de operación: `feature/local-mic-whisper-wake-lab`.
- Branch experimental: `feature/felencho-brain-realtime-engine-v1`.
- **No cambiar hologramas, pantallas de Bob/Lina, voz Serena de Lina ni flujos de producción** durante la fase de protección.
- Ryan descartado para Bob; audiciones pendientes: Eric, Aiden, Dylan.

## Inventario obligatorio (sin exponer secretos)
1. Repositorio: nombre, remotos, ramas y SHA de cada checkout, submódulos, LFS, archivos ignorados relevantes, cambios locales sin commit y repositorios hermanos.
2. Servicios: launchd/servicios, scripts de arranque, rutas absolutas, versiones de macOS, Homebrew, Node, Python, pip, MLX, Ollama (si aplica), dependencias lockfiles, puertos y pruebas de salud.
3. Modelos: modelos Whisper y Qwen3-TTS, rutas y tamaños, identificadores y revisiones, voces configuradas, modelos/weights adicionales, licencias y procedimiento de descarga si se evita copiarlos.
4. Bibliotecas: guiones del podcast, investigaciones con fuentes, música y derechos, audios, imágenes, videos, proyectos, samples, configuraciones de transmisión, archivos USB/externos de apoyo.
5. Memorias: archivos `project-memory/` **y** datos vivos de bases remotas/locales: `felencho_memories`, `felencho_memory_inbox`, `lumina_shared_memory`, `lumina_user_memory`, `lumina_brain_memory`, tablas relacionadas, índices, embeddings, objetos Storage, migraciones, permisos y propietarios. Verificar qué tablas están realmente activas en la instalación.
6. Secretos: archivo de variables de entorno, llaves API, credenciales GitHub, Supabase, LiveKit/Cartesia, certificados, llaves SSH, tokens y configuraciones de proveedor. Inventariar **nombres y ubicaciones**, no valores.
7. Logs: historial de errores sanitizado, métricas Whisper/TTS, identificadores de versión y procedimiento de diagnóstico.
8. Mac: ajustes de audio, interfaces físicas, entrada/salida, permisos de micrófono, control de acceso, certificados, automatización, volúmenes y puntos de montaje.

## Arquitectura de respaldo propuesta (regla 3-2-1)
- Copia A: equipo principal, para operación.
- Copia B: SSD externo dedicado, cifrado, con historial y snapshots; Time Machine cifrado para sistema + respaldo de datos consistente separado.
- Copia C: otro destino físico/geográfico o nube cifrada de extremo a extremo, con credenciales y clave de recuperación custodiadas fuera de La Bestia.
- GitHub **no** reemplaza respaldo de modelos, tablas, memoria viva, archivos ignorados ni secretos.
- No copiar archivos de base de datos activos sin método consistente; usar dump/export transaccional y guardar metadatos necesarios para restaurar.
- Evitar incluir tokens en logs, reportes, issues o GitHub. Nunca subir `.env`, keychains exportados, archivos de claves privadas ni dumps con datos personales sin cifrado fuerte.

## Diseño operativo de Studio Control
Un apartado privado `Seguridad y recuperación`, sin controles en pantallas de personajes:
- Estado de última copia, fecha y resultado por categoría.
- Botón «Auditar» — lectura y reporte, nunca altera servicios.
- Botón «Respaldar ahora» — ejecución de trabajos supervisados, con progreso, verificación SHA-256, logs sin secretos, y bloqueo de concurrencia.
- Botón «Verificar copia» — comparación de manifiestos, restauración de muestra en zona aislada.
- Botón «Ensayo de recuperación» — asistente guiado para **otra Mac**, nunca sobrescribe la principal.
- Alertas si la copia remota no existe, falla, no es descifrable, faltan volúmenes o el último ensayo está vencido.
- Autenticación local apropiada para operaciones que leen datos sensibles o cifran/exportan material, aunque el estudio sea de un solo operador.

## Secuencia segura de implementación
**Fase 0 — inventario sin cambios.** Confirmar procesos de 7892/3002/7894, rutas y estado de Git, memoria, bases, tamaños, discos y alcance de permisos. No guardar secretos legibles en el reporte. Identificar datos que existen solo en La Bestia.

**Fase 1 — copia base.** Crear almacenamiento cifrado y clave de recuperación fuera de La Bestia. Realizar copia consistente de datos y exportaciones de base de datos; guardar hashes y manifiesto, SHA de ramas, versiones y manual de arranque. La primera copia debe ser inmutable antes de incorporar borrados o rotaciones.

**Fase 2 — automatización controlada.** Jobs idempotentes; respaldo incremental diario de datos críticos, completo semanal y conservación mensual; exportación consistente de memoria y base de datos según criticidad. Monitorear fallos y capacidad. Los intervalos son propuesta, no configuración aplicada.

**Fase 3 — recuperación de prueba.** En otra Mac, reinstalar herramientas versionadas, clonar ramas fijadas por SHA, descargar/verificar modelos, descifrar restauración en entorno aislado, importar DB y objetos, reconfigurar secretos, comprobar permisos, lanzar 7892/3002/7894 y verificar preguntas de memoria compartida Bob/Lina y reproducción TTS. No contactar servicios de producción hasta aislar endpoints.

**Fase 4 — aceptación.** Evidencia de integridad, ausencia de secretos en reportes, tiempo de recuperación observado, ventana máxima de pérdida de datos observada, trazas de arranque y checklist firmado. Repetir después de cambios importantes.

## Condiciones de éxito — todas necesarias
- Una copia física cifrada y una copia remota cifrada verificadas, accesibles con La Bestia completamente desconectada.
- Clave de recuperación independiente del llavero de La Bestia.
- Auditoría de información sensible del repositorio público e historial; rotar claves si se prueba exposición.
- Restauración real de voces/modelos, memoria compartida y bibliotecas, no solo clonado de Git.
- Studio Control restaurado y acceso funcional a servicios 7892, 3002 y 7894 en Mac de ensayo.
- Prueba funcional de grabación, transcripción y audio sin alterar hologramas ni pantallas limpias.
- Reporte de recuperación con errores pendientes explicitados.

## Hallazgos preliminares del repositorio (no equivalen a auditoría local)
- Repositorio visible como **público** el 15-11-2026.
- Archivo `project-memory/current.json` conserva decisiones técnicas, pero su sección de prioridad está fechada 09-10-2026: **no asumir que refleja las decisiones recientes**.
- Código de `app/api/felencho-brain/recall/route.ts` lee `felencho_memories` desde Supabase; otras rutas leen tablas `lumina_*`.
- `tools/qwen3-lab/test-remaining-languages-mac.sh` utiliza `$HOME/felencho-qwen3-tts-lab` con entorno Python y salidas locales; ese contenido requiere inventario y copia o reconstrucción comprobada.
- Sin acceso directo a La Bestia desde GitHub no se puede confirmar presencia, tamaños, persistencia, respaldos cifrados ni restauración efectiva.

**Siguiente paso autorizado:** implementar únicamente el inventario de solo lectura y presentar hallazgos; después diseñar la integración de respaldo en Studio Control manteniendo intacto lo existente.
