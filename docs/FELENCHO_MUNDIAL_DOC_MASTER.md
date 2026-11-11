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

## Perfil privado de miembros e identidades vinculadas — 2026-11-11

**Regla definitiva del productor:** una confidencia de un miembro a Lina, Bob o cualquier ser inteligente nunca se comparte con otros miembros, el público, el podcast o el productor humano por defecto. Se recupera exclusivamente para la misma cuenta verificada, dentro de la finalidad de servicio autorizada. El productor no ve ni explota recuerdos íntimos ajenos sin consentimiento específico. Pueden existir excepciones estrictamente necesarias por obligaciones legales/seguridad, claramente explicadas; nunca prometer secreto absoluto imposible.

### Hallazgos existentes (Supabase Felencho-ai, consulta READ ONLY)
- `audience_profiles` YA EXISTE: nombre, correo, teléfono, Instagram, Facebook, TikTok, YouTube, idiomas, nivel de membresía, preferencias de comunicación. **No duplicar ni sobreescribir**.
- `lumina_user_profiles` y `lumina_profile_memories` YA EXISTEN como sistema anterior; revisar inventario, migración y tratamiento de perfiles antes de reutilizar para miembros.
- `studio_members` YA EXISTE, pero corresponde al equipo/estudio, no se debe mezclar con audiencia o suscriptores.
- Auditoría de catálogo: `audience_profiles`, `lumina_user_profiles`, `lumina_profile_memories`, `felencho_memories` y `felencho_memory_inbox` muestran RLS **desactivado** y sin políticas en la consulta. **P0 crítico:** no conectar miembros a estas tablas mediante API pública ni usar memorias de miembro en Brain sin aislamiento verificado. Revisar además permisos de tabla y todos los endpoints con `supabaseAdmin`.
- Diseño de migración controlada revisable: `docs/sql/member_private_profiles_v1_REVIEW_ONLY.sql`, commit `f12b4b6`. **NO APLICADA**. Revisión y pruebas negativas con 2 usuarios + anónimo obligatorias antes de ejecutarla.

### Decisión de identidad
- Una persona = un `auth.users.id` (Supabase Auth), con `audience_profiles.auth_user_id` único tras migración y vinculación verificada. Registro por email personal + OTP/magic link o inicio de sesión con proveedor compatible configurado.
- Facebook/Google pueden ser métodos OAuth sujetos a configuración; YouTube/Instagram/TikTok son fuentes de audiencia o membresías vinculables mediante APIs oficiales si están disponibles; **no afirmar que todas ofrecen login OAuth compatible en Supabase**. Ninguna red social concede propiedad de una cuenta por el mero texto de `@usuario`.
- No fusionar automáticamente cuentas por coincidencia de correo, nombre o handle. Requerir sesión previa + verificación del proveedor + consentimiento de asociación. No importar listas de seguidores sin permiso ni garantizar detectar pagos en cualquier red.
- Correo `@felencho.ai` para remitente transaccional (p.ej. `cuentas@` o `acceso@`), mediante proveedor de envío configurado con SPF/DKIM/DMARC; no crear buzones privados para todos los miembros. Correo de registro puede pertenecer a cualquier proveedor.
- Autorrelleno limitado a campos autorizados por el usuario y realmente proporcionados por el proveedor; mostrar datos editables y consentimiento separado para marketing, memorias y comunicaciones.

### Recuerdos privados de miembros
- Una memoria privada pertenece a `owner_user_id`, no a `character_key=shared`; usar separación fuerte de cuenta (RLS + validación servidor), sin vías alternativas por Brain/retrieval/logs.
- Consentimiento opt-in para memoria persistente. Privacidad por defecto, minimización de datos, sin transcripción íntegra ni grabación de voz salvo permiso específico. Los datos especialmente sensibles (sexualidad, salud, religión, familia, menores) no deben convertirse automáticamente en recuerdos; si hay continuidad explícitamente autorizada, mínima información y posibilidad de revisión/olvido.
- Bob y Lina pueden consultar recuerdos de la **misma cuenta** cuando el miembro los autorice; nunca pueden responder sobre la historia íntima del miembro a terceros ni integrarla en memorias editoriales.
- Explicar al miembro que la privacidad frente a otros usuarios no equivale a ausencia absoluta de acceso técnico/administrativo, conservación legal o revisión de seguridad. Aplicar retención corta, cifrado y controles auditables.
- **Prueba negativa imprescindible:** miembro A guarda una memoria consentida; miembro B y público/anon reciben cero resultados con consulta directa, a través del agente y por preguntas para deducirla; productor humano sin permiso no ve contenido íntimo. Prueba positiva: A cambia de Lina a Bob y conserva el contexto permitido.

### Estado del código
Se preparó solo un archivo de migración **REVIEW_ONLY** (sin modificación de base ni despliegue). No activar captación automática de datos personales ni inscripciones pagadas hasta verificar permisos, OAuth real, privacidad y sistema de saldo/recargas. La ruta de voz y Sentidos no debe modificarse en esta fase.

## Canal confidencial y seguridad emocional de miembros — 2026-11-11

**Decisión del productor:** un miembro puede crear un canal privado con Lina, Bob u otro personaje, y autorizar individualmente quién tiene acceso. En defecto, solo el miembro y **el personaje elegido** pueden utilizar sus recuerdos; ningún otro personaje, Felencho humano, otros miembros o memoria pública pueden recuperarlos. Habrá excepciones limitadas de funcionamiento, obligaciones legales y seguridad explicadas antes de conversar; NO prometer secreto absoluto.

**Protocolo completo:** `docs/FELENCHO_BRAIN_PRIVATE_CHANNEL_SAFETY_V1.md` (commit `15f9ed5`). Incluye saludo transparente, consentimiento de memoria, prevención del daño, suicidio/crisis, no llamadas automáticas a policía por palabras clave, apoyo humano y recursos locales, sin cobro por ayuda esencial en crisis, protección de menores, aislamiento por cuenta, prevención de dependencia/romance coercitivo, pruebas obligatorias y revisión jurídica/clínica.

**Estado:** política técnica documentada, **NO IMPLEMENTADA/NO DESPLEGADA**. Antes de abrir servicios privados se exige cerrar fallas actuales de RLS/autorización y registros de datos, validar límites de acceso con dos cuentas, y no tocar voces, LiveKit ni hologramas.

## Límites de conversaciones sexuales de miembros de pago — 2026-11-11

**Decisión editorial/producto:** la membresía paga minutos de conversación y acceso a funciones permitidas, no acceso irrestricto a interacciones eróticas explícitas. Lina, Bob y otros seres pueden conversar sin prejuicios sobre sexualidad adulta, consentimiento, relaciones, identidad, orientación, educación sexual, anticoncepción y bienestar; la conversación erótica destinada a excitación/roleplay sexual no forma parte del servicio V1. Definir límites con transparencia antes de cobrar; nunca avergonzar por una consulta íntima.

**Privacidad:** no convertir automáticamente declaraciones sexuales, orientación, identidad o experiencias privadas en memorias perdurables, perfiles, marketing o contenido de podcast. Consentimiento explícito para cualquier recuerdo sensible; aislamiento por cuenta y por personaje autorizado. Menores requieren controles reforzados. Coerción/explotación y contenido sexual con menores deben bloquearse.

**Protección comercial:** cobrar de forma transparente; no monetizar vulnerabilidad emocional ni usar confidencias para promover recargas. Probar respuestas empáticas y límites, protección de memorias y tratamiento justo de minutos.

**Documento de políticas:** `docs/FELENCHO_BRAIN_PRIVATE_CHANNEL_SAFETY_V1.md`, actualización `c9a055a`. Sin despliegue ni modificación de hologramas, voz, LiveKit, Cartesia o bases de datos.

## Implementación aislada: política de canales privados (2026-11-11)

- **Código creado** `lib/memberPrivacyPolicy.ts` (commit `76c2cfc`): contrato de canal privado, propietario autenticado, personaje principal, personajes autorizados, opt-in de memoria; deniega acceso de otros miembros, anónimos y Felencho humano por defecto.
- **Pruebas escritas** `lib/memberPrivacyPolicy.test.ts` (commit `22a3d7c`): A vs B, Lina vs Bob sin consentimiento, miembro propietario, canal cerrado, consentimiento y cero persistencia por defecto. **Pruebas aún NO ejecutadas**; ejecutar en La Bestia: `npx tsx --test lib/memberPrivacyPolicy.test.ts`.
- Estos son **contratos puros y pruebas de diseño**, NO endpoints reales, NO implementan autenticación, RLS, consentimiento persistente, historial ni cobros. No desplegar para usuarios hasta que el backend obtenga el usuario autenticado real y respete permisos por fila.
- **Base de datos sin cambios**; mantener `docs/sql/member_private_profiles_v1_REVIEW_ONLY.sql` sin aplicar hasta auditar el impacto en `audience_profiles` y los endpoints antiguos. No se modificó LiveKit/Cartesia/voz/Sentidos/hologramas.
- Próximo hito: preparar endpoints de identidad verificada y consentimiento en rama independiente, con pruebas de dos cuentas y anónimo, sin habilitar canales abiertos. No utilizar `supabaseAdmin` en endpoints de audiencia sin autorización comprobada del lado servidor.

## Continuidad de memoria de miembros + Cartesia/LiveKit — 2026-11-11

**Prueba comprobada por Felencho en La Bestia:** `npx tsx --test lib/memberPrivacyPolicy.test.ts` → **5 pass, 0 fail**. Son pruebas unitarias de autorización pura; **no prueban todavía** RLS, APIs o aislamiento de conversaciones reales.

### Memoria continua multicanal — alcance solicitado
- Un miembro registrado posee un identificador de cuenta único y verificado (`auth.users.id`). Puede regresar desde cualquier navegador/dispositivo/región/red enlazada por login y conservar sus **recuerdos autorizados**. Nunca afirmar identidad basada solo en voz, nombre, ubicación o perfil social visible.
- Los recuerdos pertenecen a la **persona**, pero su **visibilidad la concede esa persona**: por defecto sólo el miembro y el personaje con quien habló. Otro personaje o Felencho humano requiere consentimiento específico, revocable y auditable, por canal/recuerdo; no enlazar historias privadas a la memoria editorial.
- Memoria de sesión efímera + resumen duradero consentido con versión y fechas. Sin audio crudo ni transcripción completa por defecto. No inferir orientación sexual, salud ni otros atributos íntimos a partir de confidencias. Controles ver, corregir, exportar y olvidar.
- Concurrencia/costo: un personaje invocado en sala de miembro puede tener sesión de voz propia; **identidad, memoria y cupos se administran centralmente**. Necesitamos validación autenticada y autorización de acceso en cada llamada al Brain, no sólo en la UI del holograma.
- Prueba E2E obligatoria: misma cuenta Ana se autentica en dos dispositivos y puede retomar recuerdo consentido con Lina; Bob no lo ve a menos que Ana comparta; cuenta B no puede ver ningún dato; revocación impide nuevo acceso.

### Cartesia Sonic actual: límites y costos
Fuentes oficiales consultadas 2026-11-11:
- https://www.cartesia.ai/pricing : Free $0/mes, ~27 min TTS y 2 solicitudes simultáneas; Pro $5/mes ~133 min y 3; Startup $49 ~1667 min y 5; Scale $299 ~10667 min y 15; Enterprise a medida. **Minutos de voz generada, no de llamada**. Créditos asignados mensualmente; consumo adicional/cupos dependen del plan. Las llamadas de **Cartesia Managed Agents** usan tarifa separada, actualmente $0.03/min en página oficial, y no son el tipo de agente que está implementado en Felencho Mundial.
- https://livekit.com/pricing : LiveKit Inference Cartesia Sonic 3 TTS en Build/Ship **$0.03 por minuto TTS** como precio de referencia, más costos independientes de LiveKit Agent, STT, LLM y transporte. Validar tarifa efectiva dentro de la cuenta real antes de vender membresías.
- El worker actual `agents/lina/src/main.ts` utiliza `inference.TTS({model: "cartesia/sonic-3"})` y `inference.STT({model: "deepgram/nova-3", language:"multi"})`; **la facturación principal de este flujo se observa en LiveKit Cloud**, no debe inferirse directamente del plan de créditos Cartesia.
- Políticas operativas antes de escala: medir segundos de conversación vs voz realmente producida, contador de minutos del miembro validado en servidor, presupuesto por día/mes, límite de sesiones concurrentes, alertas al 70/90/100%, control de exceso y acceso de crisis sin paywall. Analizar volumen/idiomas, degradación segura y contrato enterprise si carga excede los límites.
- No migrar Sonic 3 a Sonic 3.6 ni modificar voces aprobadas automáticamente: comparación de calidad, idioma, latencia, precio y ensayo A/B antes de alterar producción.

## PRIORIDAD DEL PRODUCTOR: soberanía de voz y eliminación de cuotas de TTS — 2026-11-11

Felencho detuvo la idea de escalar la comunidad con Cartesia porque no acepta promesas de gratuidad ilimitada que son falsas ni una red atada a minutos de terceros. **Se reconoce el error anterior** y se prioriza una ruta de TTS autoalojado sin cuotas comerciales de voz. No confundir esto con potencia ilimitada: hay restricciones físicas y costos de hardware/energía.

**Plan técnico auditado:** `docs/FELENCHO_VOICE_INDEPENDENCE_PLAN.md`. Primer candidato Qwen3-TTS (Apache-2.0), respaldo ligero Kokoro-82M (Apache-2.0), prueba comparativa Chatterbox Multilingual V3 (MIT, pero archivado y sin mantenimiento desde agosto 2026); excluir pesos F5-TTS CC-BY-NC del uso comercial. Probar modelos primero en La Bestia M4 Max usando MLX-Audio sin tocar proyectos actuales, comparar voz de Lina/Bob, latencia en español e inglés y concurrencia.

**Camino de dependencia actual**: `agents/lina/src/main.ts` utiliza STT Deepgram Nova 3, TTS Cartesia Sonic 3 vía LiveKit Inference y Felencho Brain/LLM alojado; LiveKit Cloud transporta audio. Liberarse solo de Cartesia no libera STT, LLM, transporte ni facturación de cómputo. Diseñar adaptadores y migrar por etapas sin cambios de voces/Sentidos hasta pruebas verificadas y aprobación de Felencho.

**Estado:** documentación investigada, código LIVE intacto, sin instalación de motores, sin benchmark ni despliegue. No afirmar que Qwen/Kokoro igualan la voz aprobada sin escuchar pruebas reales.

## Decisión revisada: podcast soberano primero; luego expansión mundial — 2026-11-11

**Cambio explícito de prioridad y criterio del productor:** no exige todo gratis ni comprar servidores ahora. Quiere un podcast sin cuotas artificiales de minutos/llamadas ni bloqueo de proveedores externos, y una arquitectura portable que después escale a canales privados mundiales. **Autoriza cambiar las voces de Bob y Lina** ahora y en el futuro; la prioridad es autonomía, inteligibilidad, calidad y capacidad de sustitución. **No implica autorización para cambiar el diseño visual ni desplegar un nuevo worker sin validación.** Este criterio reemplaza en la fase futura la regla anterior de conservar exactamente las voces Cartesia; el circuito en producción permanece intacto hasta la prueba.

**Auditoría comprobada en código:** `agents/lina/src/main.ts` usa LiveKit Agents (código nuestro), `inference.STT({model:"deepgram/nova-3"})` y `inference.TTS({model:"cartesia/sonic-3"})` — ambos enrutados por LiveKit Inference/LiveKit Cloud; la función `askFelenchoBrain` llama al endpoint propio, cuyo `lib/felenchoBrainEngine.ts` usa OpenAI Responses API; memoria Supabase alojada. La creación de sala y tokens es nuestra aplicación, pero utiliza LiveKit Cloud. **No es actualmente una pila local ni gratuita ilimitada.**

**LiveKit no equivale exclusivamente a su nube:** servidor SFU y Agents abiertos, ejecutables en nuestro propio hardware. Autohospedado NO incluye LiveKit Inference: sustituir por motores locales o APIs directas. Referencias: https://docs.livekit.io/transport/self-hosting/ ; https://docs.livekit.io/intro/cloud/ ; https://docs.livekit.io/agents/models/inference/ ; https://docs.livekit.io/transport/self-hosting/deployment/ .

### Etapas propuestas sin comprometer producción
- **Lab A — podcast local en La Bestia:** Docker/LiveKit Server autohospedado en LAN (o contenedor equivalente), worker propio sin inferencia Cloud, TTS Qwen3-TTS 0.6B Apache-2.0 y Kokoro-82M Apache-2.0 como voces candidatas; STT whisper.cpp local Metal/CoreML; LLM local con Ollama/MLX y un modelo cuyas licencias permitan uso comercial. Mantener Felencho Brain como coordinador de identidad, memoria, reglas y episodios; sustituir su proveedor de inferencia por adaptador compatible probado. Todo en sandbox independiente del sistema funcionando.
- **Pruebas que definen si la ruta vale:** 2 coanfitriones, 30–60 min de charla real y cambios de turno sin retraso inaceptable; pruebas dominicano/español/inglés e interrupciones; medir latencia p50/p95, CPU/GPU/memoria, STT error, claridad TTS, coste eléctrico, consumo y carga de dos voces; preservar fotos, anillos y seis Sentidos. Sin resultados, no afirmar que «sin límites» equivale a capacidad ilimitada. El equipo M4 Max puede ser cuello de botella si simultáneamente renderiza video/hologramas.
- **Lab B — estudio LAN:** MacBook Pro maestro, RØDECaster audio, dos PCs/TVs verticales de Bob/Lina, YoloBox streaming independiente. TLS y red deben planearse; no exponer el servidor de desarrollo públicamente.
- **Mundial después:** servidores dedicados/VPS bajo administración de Felencho.ai con dominio, SSL, TURN, monitoreo, backups, control de costos, identidad segura, regiones y capacidad concurrente por GPU. Inicio en una región y replicación cuando los datos lo justifiquen. LiveKit SFU usa CPU/red; STT/TTS/LLM consumen GPU/CPU por separado. Internet, dominios, electricidad, hardware y conectividad siguen siendo servicios con costos/capacidad física.
- **Canales privados:** mantener el trabajo de privacidad y aprobación en rama sin exponer memoria sensible. RLS, autenticación y retención antes de suscriptores. El podcast local no requiere abrir esos canales todavía.
- **Contingencia:** retener la versión actual LiveKit Cloud + Deepgram + Cartesia como respaldo aislado hasta aprobar la independencia. No perder repositorios ni reescribir hologramas.

**Status 2026-11-11:** fuentes y código contrastados, decisiones registradas, **NO se ha instalado ni medido todavía** la pila local, no se ha desplegado LiveKit autohospedado, no hay cambios en producción. Próxima entrega técnica: prueba local desechable y comparación de calidad/capacidad antes de migración.

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
