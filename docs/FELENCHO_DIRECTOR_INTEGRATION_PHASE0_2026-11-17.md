# Felencho Mundial — Integración Director/Lumina → teleprompter → Brain (fase 0)
Actualizado 2026-11-17. Estado: **adaptador de datos añadido, NO conectado ni desplegado en La Bestia**.

## Inventario comprobado en rama
- `app/lumina/producer/page.tsx` prepara proyecto, guion, escenas y líneas.
- `app/api/lumina/generate-script/route.ts`, `generate-scenes`, `generate-lines` mantienen artefactos Lumina.
- `app/api/lumina/lumina_producer/session/route.ts` y `next/route.ts` controlan sesiones y avance de línea.
- `lib/StudioRunSheet.ts` define escaleta; `lib/StudioTeleprompter.ts` calcula pantalla a partir de la escaleta.
- `lib/StudioDirector.ts` y `lib/StudioModerator.ts` tienen dirección de voces, handoff y pistas de teleprompter.
- `lib/studioProducerCueBridge.ts` (nuevo) normaliza líneas a indicaciones de guion para Felencho, contexto para Bob/Lina, y pautas para invitados sin hablar ni escribir.

## Diferencias críticas detectadas
1. Lumina es código existente, pero no se ha demostrado **sincronización activa** con la app iPad BestView ni con Realtime Lab local de puerto 3002.
2. El generador antiguo permite `Felencho Virtual`, no equivale a otro coanfitrión independiente: se debe mapear a **guion del presentador humano** solo después de verificar intención de cada línea.
3. `ProducerPanel.tsx` usa un valor fijo `script_id: "lumina-studio-v1"` al crear sesión. La integración real debe recibir el ID real del guion seleccionado, sin duplicar sesiones.
4. Algunas rutas Lumina usan una credencial privilegiada Supabase. **No abrir endpoints accesibles a invitados/público sin autorización del servidor**, y no enviar la clave al navegador/iPad.
5. Los `hostCue` del RunSheet no constituyen todavía guion completo sincronizado en la tableta; `buildTeleprompterScreen` es un modelo de datos, no verificación de despliegue iPad.

## Flujo objetivo de ensayo
Felencho abre Studio Control → elige un guion existente → el Director genera una instantánea de solo lectura con `script_id`, escenas y líneas ordenadas → teleprompter web del iPad recibe exclusivamente texto del presentador, indicación siguiente y controles seguros → Bob/Lina reciben **contexto relevante**, no una orden automática de hablar → Felencho habla, pregunta o dice «adelante», y el Director de Turnos concede permiso → las respuestas y los datos consentidos vuelven al resumen de episodio → cierre guarda/exporta antes de terminar.
El control remoto BestView físico y su compatibilidad con una página web propia requieren prueba real.

## Reglas de seguridad
- Ensayo sin cambios en servidores 7892/3002/7894 ni LiveKit/hologramas.
- Identificar y preservar guion original, permisos, roles, autor y fuentes.
- Never autopublish or trigger Bob/Lina speaking from a `cue` alone.
- No transmitir transcripciones de invitados sin consentimiento. No activar memoria privada automática.
- Mantener Dylan para Bob y Serena para Lina; el motor visual es una fase posterior.

## Hologramas: investigación, no ejecución
Se busca una cabeza de energía y puntos luminosos, volumétrica, sin estética caricaturesca, de gran tamaño en TV vertical, con labios y expresiones reactivas al mismo audio digital que suena en Mac. Puede partir de imagen de referencia + prompt para identidad visual, pero exige rig/deformación, coordenadas de boca o visemas y render 3D en navegador para movimiento real, no basta una imagen fija.
No crear un segundo servicio de streaming sin medir primero el puente WebRTC/LiveKit existente. El render local en PCs de las TVs permitiría repartir carga GPU, pero debe verificarse contra los equipos reales.

## Pruebas de recursos pendientes en La Bestia
- Memoria unificada disponible y presión de memoria, uso por proceso y swap; GPU/CPU durante mezcla de Qwen STT TTS y streaming, temperatura/estabilidad, FPS de dos renders en equipos destino.
- Medir línea base inactiva, conversación completa de 30 min y stress de 60 min; pruebas con y sin visual. Registrar p50/p95 del primer audio y cortes.
- Exigir rollback por etapa y ensayo físico con iPad/teleprompter sin cambiar producción.
