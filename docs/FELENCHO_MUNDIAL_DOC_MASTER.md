# FELENCHO MUNDIAL — DOC MASTER / STUDIO HOLOGRAM MODE

**Actualizado:** 2026-11-11 · **Estado:** integración de prueba, NO producción · **Repositorio:** dtcglobalapp/felencho-universe · **Rama:** `feature/lovable-hologram-studio-v1` · **PR:** #30 (borrador)

> Este documento complementa `project-memory/current.json` y sustituye sus prioridades operativas obsoletas de octubre (LiveAvatar/ElevenLabs/avatar de video). No borrar la historia técnica previa. La prioridad es conservar la versión funcional y evolucionar por pruebas verificadas, no volver a empezar.

## Decisión del productor — Felencho

- BOB y LINA son **coanfitriones holográficos 3D**, con retratos aprobados y seis **Sentidos**: idle/en espera, listening/escuchando, thinking/pensando, speaking/hablando, watching/observando, sleep/descansando.
- El productor dirige con la **voz**, NO con botones «dar la palabra» o «volver a espera» durante el programa. Los controles físicos/manuales quedan solo como respaldo técnico y apagado de emergencia.
- Comandos ya implementados como base de referencia en `app/studio-listener/page.tsx`, `lib/StudioDirector.ts`, `lib/StudioModerator.ts`: nombres **«Bob»** y **«Lina»** (wake words), intervenciones dirigidas y turnos compartidos, comandos de apagado del estudio; recuperar y adaptar sin duplicar motores. **«A dormir»** por personaje debe verificarse/implementarse en el nuevo controlador: no atribuirlo al código actual sin prueba.
- BOB y LINA deben poder escucharse mutuamente, oír al productor, responder con turnos naturales, interrumpirse de manera controlada y compartir contexto; el productor autoriza intervenciones con voz. No crear bucles de auto-respuestas sin límite.
- La OBSBOT es la **única cámara de visión compartida** y la activa Felencho cuando lo solicita. La cámara no debe enviar video indiscriminadamente a dos cerebros independientes.
- La Bestia (MacBook Pro M4 Max) es el **audio master** hacia RØDECaster Pro II. TVs/PCs verticales solo renderizan personajes sin micro, sin audio principal y sin paneles.
- Felencho Brain es la inteligencia y memoria compartida, LiveKit la comunicación, Cartesia Sonic 3 la voz actual y el motor React Three Fiber/Three.js la representación visual. **LemonSlice/LiveAvatar/HeyGen quedan fuera del nuevo camino holográfico**. No borrarlos sin inventario y pruebas de paridad, y no activar despliegues que alteren el agente funcional en producción sin validación.
- La presencia visual debe poder quedar activa sin una sesión conversacional facturable. Silenciar el micrófono no elimina necesariamente costos de salas, agentes, STT/TTS ni garantiza que un personaje no siga hablando; separar presencia, escucha, autorización y apagado.
- No cambiar rostros, fotografías, estados aprobados, iluminación, partículas, anillos, layout 9:16 ni voces actuales sin decisión explícita de Felencho. La identidad verbal es **«Felencho»**, nunca «Fel.ai» o «Fel».

## Inventario técnico existente: reutilizar

| Componente | Archivo / ruta | Estado confirmado |
| --- | --- | --- |
| Master y bitácora histórica | `project-memory/current.json`, `/api/project-memory` | Existe; contenido de 2026-10-09 desactualizado en puntos clave |
| Escucha por nombre / director de turnos | `app/studio-listener/page.tsx`, `lib/StudioDirector.ts`, `lib/StudioModerator.ts` | Código existente; NO integrado/validado con nuevo LiveKit holográfico |
| Control antiguo de presencia | `app/studio-control/page.tsx`, `lib/PresenceStudioController.ts`, `lib/StudioSync.ts` | Código existente; NO sustituir ciegamente |
| Hologramas aprobados | `src/hologram/*`, `/hologram-preview/lina`, `/hologram-preview/bob` | Lina visual confirmada; Bob requiere ensayo equivalente |
| Control de conversación actual | `/hologram-preview/studio/lina`, `/hologram-preview/studio/bob` | Lina habló y obedeció corrección de nombre, la voz se escuchó con buena calidad |
| Holograma conectado a audio | `/hologram-preview/live/lina`, `src/hologram/LiveKitAudioBridge.tsx` | Anillos y fotografías por estado observados en prueba de Lina antes de regresión |
| Voz LiveKit / Cartesia | `agents/lina/src/main.ts`, `agents/lina/src/characters.ts` | Código nuevo no importa LemonSlice; despliegue en nube NO verificado |
| Assets originales | `dtcglobalapp/felencho-hologram-engine` privado, perfil JSON exportado de Lovable | Retratos y 6 fotografías de Lina importadas en navegador localhost; NO públicos ni automáticamente compartidos con otras TVs |

## Incidente/rollback 2026-11-09

1. Se confirmó Lina conversando con Felencho, respondiendo fluida y respetando su nombre; anillos y seis expresiones por estado ya reaccionaban tras importar galería.
2. **Regresión**: se añadieron botones «DAR LA PALABRA», «VOLVER A ESPERA» y lógica de silenciamiento no solicitada (commits `e586601`, `746b575`), interfiriendo con el flujo probado; usuario observó Sentidos DESCANSANDO, PISTA NO RECIBIDA, SALA DESCONECTADA al abrir la pantalla.
3. **Restaurado en rama** el controlador `HologramStudioClient.tsx` a la versión del commit `12445a5`, y el puente `LiveKitAudioBridge.tsx` a la misma versión (reverts posteriores). Esto NO equivale a ensayo end-to-end posterior; ejecutar prueba antes de marcar corregido.
4. **No fusionar ni publicar** PR #30 sin restauración funcional, build y prueba de los dos hologramas. No perder el JSON de las fotografías de Lina; está en almacenamiento local del navegador.

## Diagnóstico 2026-11-10: TV de Lina con voz, sin Sentidos visuales

**Observado por Felencho:** Lina ya aparece en la pantalla física de NY, habla y escucha, pero el rostro no pasa a PENSANDO/HABLANDO. **No se ha confirmado qué URL exacta abre esa pantalla.**

**Hallazgo verificable en el código:**
- `app/presence/lina/page.tsx` todavía usa `PresenceAvatar` (sistema legado, no el nuevo puente de LiveKit).
- `/hologram-preview/lina` muestra el holograma pero NO monta `LiveKitAudioBridge`; sirve para previsualización.
- `/hologram-preview/live/lina` sí monta `LiveKitAudioBridge`, pero debe recibir un enlace temporal con token de la misma sala LiveKit. La pantalla debe conectarse y mostrar `Pista de voz: RECIBIDA` y `SALA CONECTADA` para poder reaccionar al audio.
- Las seis fotografías por estado fueron importadas al almacenamiento local del navegador de La Bestia, **no viajan** por GitHub o LiveKit hasta el navegador de la PC de TV en NY. La TV necesita importar el JSON en su propio origen/navegador o un despliegue seguro de assets compartidos. `photoForState` utiliza la foto principal si falta una específica.
- Estar oyendo a Lina por el RØDECaster o ver su cara **no demuestra** que la TV reciba la pista del agente.

**Próximo diagnóstico obligatorio ANTES de cambiar código:** identificar la URL exacta de la TV y comprobar si es `/presence/lina`, `/hologram-preview/lina` o `/hologram-preview/live/lina`; verificar `SALA CONECTADA`, `Pista de voz: RECIBIDA` y que el perfil local de la TV tenga fotografías por estado. No desplegar, rediseñar ni alterar el flujo de voz mientras se identifica el enlace faltante.

## Arquitectura de memoria selectiva — decisión 2026-11-11

**Objetivo:** Bob, Lina y futuros seres inteligentes recuperan experiencias y decisiones pasadas sin conservar todas las conversaciones crudas.

- **Memoria inmediata de sesión:** unos turnos recientes y un resumen de contexto de la conversación actual. Temporal, expiración corta al cerrar, no equivale a memoria permanente.
- **Candidatos de memoria permanente:** hechos confirmados, acuerdos de producción, preferencias persistentes, correcciones explícitas, hitos y planes futuros. Registrar fecha, fuente, personaje(s), alcance compartido/privado, confianza y vigencia.
- **Aprobación:** reutilizar `felencho_memory_inbox` antes de persistir recuerdos sensibles o ambiguos. El productor puede decir «recuerda esto» o «no guardes esto». Evitar guardar comentarios casuales o inferencias como hechos.
- **Almacenamiento:** reutilizar `felencho_memories` y `felencho_memory_links`; todos los personajes consultan memoria compartida por defecto, más memoria específica cuando corresponda, respetando los niveles de visibilidad.
- **Recuperación:** reutilizar `lib/felenchoBrainEngine.ts` y el endpoint `/api/felencho-brain/recall`; seleccionar solo recuerdos pertinentes a la pregunta, con contexto y prioridad. La memoria no puede inventar hechos ni confundir correcciones informales con órdenes permanentes.
- **Privacidad:** revisión obligatoria antes de activar la captura. El endpoint actual `app/api/felencho-brain/recall/route.ts` inserta `user_question` completo en `felencho_recall_logs`; esto contradice «no guardar todo». Diseñar registros mínimos o sin texto, retención temporal, controles de borrado y consentimiento de invitados. Sin consentimiento explícito, no conservar datos personales de terceros ni conversaciones completas.
- **Identidad verbal:** el nombre del presentador es «Felencho», nunca «Fel.ai» o «Fel». Registrar como configuración del personaje, además de recuerdo, para no depender únicamente de recuperación semántica.
- **Estado real:** tablas/rutas e índice de recuperación existentes; integración de aprendizaje automático aprobado y retención privada NO verificada. No afirmar que Bob/Lina ya comparten recuerdos automáticamente.
- **Audio/visual:** esta fase NO modifica el motor de Sentidos ni el worker de LiveKit. Primero diagnosticar la URL exacta de la TV de Lina y sus pistas; el texto «[pegar URL]» es un marcador, no una dirección verificada.

**Prueba de aceptación pendiente:** Felencho acuerda un hecho no sensible con Lina, lo aprueba como memoria, cierra la sesión y días después Bob lo recupera correctamente sin transcripción completa ni acceso a recuerdos privados de invitados.

## Próxima implementación acordada

1. Hacer una **prueba de regresión con Lina**, solo para confirmar voz, reacciones reales y desconexión; usar la versión restaurada. Conservar las fotos en IndexedDB y su exportación JSON segura.
2. Unificar las rutas actuales de LiveKit con el **director de voz existente** (wake words Bob/Lina y «a dormir»), sin agregar botones a las pantallas de TV. Empezar con detección/autoridad sobre el micrófono de La Bestia y entrega de turno mediante un único coordinador de voz.
3. Solo iniciar respuesta si el turno fue autorizado por el coordinador; la conversación compartida usa contexto común y separación de pistas de audio por personaje.
4. Implementar OBSBOT/visión solo bajo orden expresa, una vez estabilizados ambos personajes.
5. Seguridad y costos: sesión de escucha de control separada de agentes STT/TTS por personaje; medir costos y validar que sueño/presencia no mantienen trabajos facturables. Apagado seguro único.
6. Registrar **cada hito probado** en este Doc Master y `project-memory/current.json`; guardar también fallos, commit, comandos de prueba y siguiente paso. No abrir sistemas ya resueltos sin revisar la documentación.

## Regla de trabajo para Smart

Antes de cualquier cambio: leer este master, inspeccionar módulos de producción anteriores, revisar el último commit funcional, crear rama de prueba/commits reversibles, definir prueba de aceptación. **No reemplazar un flujo conversacional con botones sin autorización de Felencho.** No afirmar que algo funciona por un commit si no hay prueba real en La Bestia.

## Frase de continuación

«Smart, lee el Doc Master `docs/FELENCHO_MUNDIAL_DOC_MASTER.md` y `project-memory/current.json`; confirmemos el rollback y recuperemos los comandos de voz Bob/Lina/a dormir, manteniendo los Sentidos y la conversación comprobada sin botones de intervención.»
