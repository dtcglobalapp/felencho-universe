# Felencho Mundial — arquitectura de cohosts en vivo (objetivo)

**Estado:** diseño experimental, no desplegado. Fecha: 2026-11-03.

## Principio de producto
Los cinco segundos de Lina son una **prueba offline de sincronización**, no un límite de conversación. La meta es que Felencho, Bob y Lina puedan sostener programas de varias horas con presencia continua, voz bidireccional, interrupciones y recuperación ante fallos, sin generar un MP4 completo por cada turno. Ninguna prueba hasta ahora demuestra latencia de tiempo real ni horas de estabilidad.

## Componentes previstos
1. **Presence Controller:** mantiene a Bob y Lina en estados `idle / listening / thinking / speaking / recovering / sleeping`. Los avatares pueden seguir visibles en `idle` y `listening` con movimientos leves precomputados o un motor ligero; no requiere inferencia costosa permanente.
2. **Turn Orchestrator:** decide quién puede hablar, atiende la palabra del conductor, barge-in, wake words, botón de hablar y orden de dormir; evita que Bob y Lina se respondan indefinidamente.
3. **Audio pipeline:** captura del mezclador del estudio, detección de voz, reconocimiento de habla, respuestas, síntesis de voz en fragmentos y subtítulos; rutas de audio separadas para evitar eco entre cohosts.
4. **Animation adapters:** interfaz común `prepare / start_speaking / push_audio / interrupt / idle / health / stop`. Evaluar EchoMimic como calidad de referencia offline y MuseTalk/u otro motor de baja latencia como candidato en vivo. No asumir que EchoMimic V3 Flash admite streaming continuo.
5. **Transport:** flujo audiovisual con baja latencia (evaluar WebRTC/LiveKit en sandbox primero); no modificar las sesiones ni servicios existentes. Las pantallas dedicadas consumen un stream de presencia por cohost.
6. **Studio Control:** estado de los tres participantes, salidas de audio, recuperación manual, control de recursos, guiones y teleprompter. Conserva el flujo actual RØDECaster/YoloBox sin reemplazarlo hasta validar.
7. **Supervisor:** límite de sesiones, monitor de FPS, VRAM, latencia de audio y video, watchdog de salud, reconexión y degradación controlada (imagen animada ligera o imagen fija + voz si cae GPU).

## Presupuesto y métricas de aceptación (objetivos, no resultados medidos)
- Latencia de inicio de respuesta y de lip-sync: **medir con marcas de tiempo**; establecer límites luego de una línea base real.
- Cohost único primero; después Bob + Lina concurrentes con recursos reservados.
- Test de resistencia escalonado: 5 s offline → 1 min → 10 min → 60 min → varias horas, solo al superar cada etapa.
- El video debe poder permanecer conectado aunque el avatar no hable; ciclos de reposo no consumen inferencia pesada continuamente.
- Medir uso de VRAM, CPU, temperatura, FPS, audio/video drift, reconexiones, fallos, coste por hora.
- Barge-in: una interrupción debe detener el audio antiguo y el movimiento asociado antes de iniciar la respuesta nueva.
- No afirmar que una RTX 4090 pueda ejecutar dos motores pesados de forma simultánea sin benchmark.

## Separación de fases
- **Fase 2C:** pruebas locales offline y controles del runner. Issue #22 confirmó la fórmula de frames y 42 pruebas unitarias pasaron. No hay render real.
- **Fase 2D:** un render privado de Lina de cinco segundos, autorizado explícitamente, con artefacto aislado y validado.
- **Fase 3A:** benchmarking comparativo de avatares, modos idle/speaking y lag en un solo avatar.
- **Fase 3B:** stream de un avatar en sandbox con audio en segmentos, interrupción y reconexión.
- **Fase 3C:** dos cohosts, mezclado y panel de estudio en sandbox.
- **Fase 4:** pilotos progresivos de larga duración; integración gradual y reversible con el estudio.

## Restricciones innegociables
- PR #8 sigue como borrador; no fusionarlo sin instrucción.
- No cambiar originales de `/workspace/felencho-avatar-engine` ni experimentos locales.
- Bridge de Issues mantiene solo acciones exactas de inspección hasta autorizar un runner seguro.
- No exponer tokens, voz privada, imágenes de referencia ni MP4 por Issues públicos.
- No alterar LemonSlice, LiveKit, Presence o rutas de producción del podcast.
- El motor de conversación y el motor gráfico son piezas independientes y reemplazables.

## Prototipo offline de orquestación (aún sin streaming)
- `live_cohost_state_offline.py` define sesiones conectadas y estados por actor separados del motor gráfico. Las operaciones de conexión, escucha, inicio de turno, interrupción, fin, dormir y desconexión son transformaciones puras en memoria.
- Una sola voz IA puede estar en `speaking` a la vez; el conductor debe otorgar explícitamente el turno. Interrumpir silencia el actor en el estado lógico; **todavía no interrumpe ningún audio físico**.
- `test_live_cohost_state_offline.py` comprueba presencia mientras están en reposo, turnos exclusivos, prioridad del conductor, interrupción, estados dormidos y rechazo de IDs inválidos.
- Estos archivos NO están conectados al Bridge, a LiveKit, a Presence o al estudio. No generan voz/video y no sostienen realmente una transmisión. Las pruebas deben ejecutarse antes de declarar la lógica validada.

## Prototipo de bloqueo de audio tras interrupción (4 nov 2026)
- `live_audio_gate_offline.py` define una generación monotónica por turno, exclusión de cohosts y una orden de prioridad del conductor. Toda interrupción invalida fragmentos de voz en cola; al liberar prioridad, los turnos viejos siguen rechazados incluso cuando se reutiliza el mismo ID.
- `test_live_audio_gate_offline.py` cubre audio tardío, bloqueo de turno mientras habla Felencho, turnos exclusivos, IDs malformados y finalización de respuesta.
- **Aún es lógica pura offline**: no silencia ninguna pista física del RØDECaster, no para tareas TTS en curso, no interactúa con LiveKit ni garantiza latencia real. Antes de integrarlo, un adaptador de audio debe comprobar `allow_chunk` en el último punto de entrega y cancelar tareas/subidas al cambiar generación.
- Código y tests guardados en la rama experimental, pendientes de ejecución de CI; no implica GPU ni render de avatares.
