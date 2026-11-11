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

## Inventario real de formularios, memoria de episodios y membresías — 2026-11-11

### Formularios ya construidos; NO volver a crearlos
- `/felencho-brain` → `app/felencho-brain/FelenchoBrainClient.tsx`: formulario de Memoria Manual (categorías music/family/biography/projects/guests/studio/corrections, etc.), selección de personaje o `shared`, título, contenido, importancia, visibilidad, etiquetas; Memory Inbox con Aprobar/Rechazar; memorias aprobadas.
- API existente `/api/felencho-brain/memories`, `/memory-inbox`, `/memory-inbox/approve`, `/memory-inbox/reject`, `/recall` y `/corrections`. Histórico antiguo `/api/lumina/brain-memory` — NO crear cerebro paralelo.
- Inventario SQL READ ONLY confirmado del proyecto Supabase de producción `Felencho-ai`: `felencho_memories`, `felencho_memory_inbox`, `felencho_conversations`, `felencho_guests`, `felencho_corrections`, `felencho_memory_links`, `felencho_memory_topics`, `felencho_knowledge_entities`, `felencho_recall_logs`, `podcast_episodes`, `felencho_character_identity`. NO se hicieron escrituras a la base.
- El agente `agents/lina/src/main.ts` envía sólo cuatro turnos recientes de su propia sesión a `/api/felencho-forever/conversation`; no transmite un resumen perdurable, `episode_id` ni identificador compartido de participante. Por tanto, recuerdos cross-session/cross-character NO están completos.
- Prueba de aceptación propuesta: una conversación autorizada en Vega Baja, Puerto Rico, produce un resumen mínimo pendiente de aprobación; luego Bob y Lina recuperan contexto en NY, sin atribuir palabras que no fueron guardadas.

### Diseño de memoria selectiva por podcast
1. **Sesión viva:** contexto compartido y resumen rodante por `studio_session_id`, intérprete `speaker_id`, `episode_id`, participantes, temas y última pregunta/respuesta; no persistir todo el audio ni transcripciones íntegras por defecto.
2. **Ficha del episodio:** reutilizar `podcast_episodes` para título/estado y crear, SOLO tras revisar esquema y autorizaciones, tabla de relación episodios-participantes y `episode_recap` (resumen aprobado, preguntas significativas, respuestas/argumentos clave, referencias y seguimientos). El historial editorial puede conservar turnos seleccionados, no todo el chat.
3. **Memorias perdurables:** los hitos/correcciones se proponen en `felencho_memory_inbox` (no escritura automática a memorias definitivas), se aprueban y se enlazan a temas, episodios, participantes y personajes. Permitir olvidar/corregir datos.
4. **Recuperación por contexto:** antes de cada respuesta buscar memorias `shared` y específicas según personaje, público/privado, episodio y personas autorizadas; inyectar solo fragmentos relevantes. Resolver identidad de Felencho y compañeros como reglas invariables de personaje.
5. **Privacidad:** separar conversaciones de invitados, miembros, productor y menores. Los consejos sobre sexualidad/orientación y otras cuestiones personales son privados por defecto, no recuerdos públicos del programa. No reutilizar relatos personales para episodios sin consentimiento específico.

### Membresías y minutos de conversación — proyecto por fases
- Un usuario autenticado tiene `account_id`, identidades verificadas de proveedores `provider_identity`, derechos de membresía `entitlement`, saldo de **segundos** de conversación, sesiones y eventos de facturación. Entitlement no se deduce de nombre de usuario: verificar la membresía por una integración oficial autorizada o por compra directamente en Felencho.ai.
- Flujo de producto: inicio de sesión → verificar membresía → asignar cupo → iniciar conversación con Bob/Lina → contabilizar tiempo consumido en servidor → congelar saldo al agotar → permitir recarga pagada → continuar el contexto de la misma sesión. Mostrar costo y saldo antes de aceptar pago y usar ledger transaccional idempotente para evitar doble cobro.
- **Integraciones limitadas:** YouTube Members API sólo está disponible para creadores con acceso aprobado; no prometer habilitación universal. Patreon API v2 admite integración con OAuth/webhooks sujetos a permisos. Para otros proveedores, verificar acceso legal/técnico antes de vender la modalidad «cualquier red social».
- **Consejos personales:** identidad de IA clara, límites de asesoramiento profesional, control de privacidad, moderación y protección especial de menores. No imponer categorías o inferencias sensibles en memoria personal.
- **Condición previa innegociable:** los endpoints actuales `/api/felencho-brain/memories`, `/memory-inbox`, `/guests` exponen operaciones con cliente privilegiado `supabaseAdmin` sin comprobación explícita de autorización en los handlers revisados; riesgo de acceso/edición de memorias privadas si están públicamente alcanzables. Corregir autorización del lado servidor y políticas/RLS antes de abrir suscripciones ni introducir más datos privados. `/api/felencho-brain/recall` también registra `user_question` íntegro; actualizar política de retención.
- No lanzar cobros reales, permitir lectura pública de memoria privada ni crear suscripciones pagadas hasta pasar pruebas de identidad, permisos, consumo de minutos, cancelaciones/reembolsos y límites de gasto.

### Orden de trabajo para Smart
P0 inventario/autorización de formularios y memoria (proteger endpoints privados). P1 contexto persistente de podcast + Inbox y recuperación cross-character con consentimiento. P2 pantalla de episodios/participantes/seguimientos. P3 acceso de miembros, minutos y recargas. P4 integración de redes sociales una a una con verificación oficial. En paralelo, identificar URL real de la TV de Lina; el placeholder `[pegar URL]` no permite diagnosticar los Sentidos.

## Motor de memoria autónoma propuesto — Fase 0, 2026-11-11

**Pedido del productor:** los formularios de Felencho Brain son vistas administrativas, no el método primario de alimentar conocimientos. Los seres inteligentes deben detectar, resumir, categorizar, relacionar, recordar y recuperar información automáticamente; la autonomía no debe suponer pérdida de privacidad ni inventar recuerdos.

### Flujo de ingestión (por construir, NO conectado todavía)
1. **Entradas permitidas**: turnos STT efímeros de la sala de estudio; datos editoriales de episodios; conversaciones de miembros sólo con consentimiento y configuración individual. Ningún audio crudo guardado por defecto.
2. **Memoria de trabajo**: resumen móvil breve de la sesión con participantes, asunto, decisiones y últimos turnos. Retención corta y expiración cuando ya no es necesaria.
3. **Extractor inteligente**: después de cada bloque relevante o al finalizar episodio, devolver salida estructurada: `category`, `title`, `summary`, `character_key`, `audience_scope`, `owner_user_id`, `episode_id`, `consent_status`, `confidence`, `importance`, `tags`, `related_memory_ids`, `source_session_id`, `expires_at`. Rechazar inferencias no confirmadas y conservar enlaces de procedencia mínimos.
4. **Clasificador de política**: memorias editoriales no sensibles y hechos expresamente solicitados pueden proponer persistencia; datos personales/sensibles, consejos íntimos, salud, sexualidad, terceros e invitados requieren autorización explícita y separación de tenant. Nunca hacer públicas conversaciones privadas; no inferir atributos sensibles.
5. **Persistencia diferenciada**: resumen de episodio y temas pendientes en repositorio editorial; recuerdo familiar/creativo del productor en `felencho_memory_inbox` hasta política aprobada; recuerdos personales de miembro en almacenaje asociado a su propia cuenta y reglas de privacidad. No usar `shared` para historias privadas de audiencia.
6. **Consolidación**: deduplicar, actualizar versiones al recibir correcciones, conectar entidades y fechas; no sobrescribir automáticamente fuentes originales. Asentar quién confirmó un hecho.
7. **Recuperación bajo demanda**: búsqueda híbrida semántica + filtros de acceso/propietario + relevancia temporal y fuentes; inyectar sólo pocos fragmentos pertinentes en Brain. Nunca recuperar recuerdos privados de otro usuario.
8. **Olvido y auditoría**: miembros pueden ver, corregir, exportar y solicitar eliminación de recuerdos y resúmenes personales; definir retención mínima y borrado verificable.
9. **Regresión**: no tocar LiveKit, Cartesia, hologramas, Sentidos ni controles de voz para introducir esta fase; desarrollar extractor offline con entradas sintéticas y probar primero.

### Hallazgo de privacidad de prioridad CRÍTICA
- En código actual `lib/felenchoBrainEngine.ts`, `logBrainCall` envía **pregunta completa, contexto de memoria y respuesta completa** a `felencho_recall_logs`. Es una forma de retención completa de turnos, aunque no exista grabación de audio; es incompatible con la regla de minimizar los datos hasta corregirla y definir controles de acceso y retención.
- En `/api/felencho-brain/memories`, `/memory-inbox` y `/guests` se usa `supabaseAdmin` sin autorización explícita en el handler inspeccionado. Prioridad: controles de identidad de servidor, acceso por propiedad/alcance, pruebas negativas para público no autorizado y auditoría de políticas/RLS antes de activar el extractor o membresías.
- **No habilitar extracción automática en producción mientras persistan esos riesgos.** Evitar capturar conversaciones de terceros para pruebas.

### Pruebas de aceptación
- **Felencho/Vega Baja**: una conversación consentida propone un recuerdo de viaje verificado; Lina lo recupera días después y Bob puede acceder a la misma memoria compartida.
- **Podcast**: un episodio produce automáticamente resumen, participantes, puntos en debate y seguimiento; otro episodio recupera el resumen atribuido correctamente.
- **Miembro privado**: una persona conversa con Lina, opta por recordar un dato permitido y lo recupera en su próxima sesión; Bob en sesión de otro usuario NO tiene acceso; Felencho productor no ve datos íntimos sin consentimiento.
- **Sin permiso/no guardar**: al decir «no recuerdes esto» no persiste resumen; historial efímero se descarta según política.

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
