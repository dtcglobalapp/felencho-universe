# Felencho Actor Engine — Fase 2C (diseño; NO habilitado)

Estado al 2026-11-03:
- Bridge de GitHub Issues autenticado, diagnósticos #9/#10 exitosos.
- Inspección de scripts y modelos #11 completada.
- Preflight #12 inicialmente bloqueado por falta de FFmpeg.
- #13 confirmó ausencia de FFmpeg en el PATH.
- Tras instalar FFmpeg, #14 devolvió `preflight_pass` para Lina en **MuseTalk** y **EchoMimic**.
- El preflight verifica presencia de archivos, duración WAV y presencia de FFmpeg; **NO** verifica inferencia GPU, disponibilidad de VRAM, compatibilidad de dependencias ni calidad del vídeo.

## Primer objetivo
Obtener un **único clip aislado de 5 segundos** de Lina, primero con el motor con mejor resultado facial (EchoMimic V3 Flash), sin tocar originales ni producción. MuseTalk podrá probarse después, con el mismo audio de referencia, para comparar sincronización labial.

## Condiciones obligatorias antes de habilitar `render`
1. Conocer y fijar el comando de inferencia real del **checkout local**, sin asumir que los nombres de parámetros descubiertos bastan para ejecutar el modelo. Validar las dependencias, entrypoint, modelo y tipos de entrada en el entorno correcto.
2. Mantener código de motores, pesos, imagen y WAV como **solo lectura**. Fijar rutas canónicas y huellas de los scripts; denegar enlaces simbólicos y rutas fuera de la lista blanca.
3. Crear un directorio privado independiente bajo `/workspace/felencho-runpod-bridge/outputs` (o almacenamiento privado equivalente) con permisos restringidos. Prohibir salidas dentro del repositorio del motor y no sobrescribir experimentos.
4. Una sola tarea GPU a la vez, ejecución no concurrente mediante lock atómico, IDs únicos y registro persistente e idempotente. Un Issue repetido nunca debe ejecutar dos renders.
5. Solo comandos **predefinidos en código**, sin shell, parámetros libres, rutas, URLs o código enviados por Issues. Autor exacto, título y cuerpo exactos; sin acción `exec`.
6. Establecer un presupuesto acotado de tiempo y recursos y realizar parada segura del grupo de procesos en caso de timeout. Verificar el manejo de hijos, errores y cancelación antes del primer render. No reiniciar el Pod automáticamente.
7. Validar MP4 final con `ffprobe`: duración aproximadamente 5 s, pista de video, dimensiones y FPS esperados, tamaño máximo definido; fallar de forma cerrada ante salida inválida.
8. Devolver por GitHub solo metadatos acotados (estado, ID, motor, duración, tamaño, SHA256 y logs redactados). **No enviar MP4 ni tokens por Issues**, ni publicar enlaces sin autenticación.
9. Descargar el MP4 posteriormente mediante un mecanismo autenticado, de corta duración y privado, aprobado por el propietario. No habilitarlo por defecto.
10. Conservar PR #8 como borrador, sin fusionar; conservar LiveKit/LemonSlice/Presence fuera de toda prueba.

## Etapas de implementación
- 2C-1: inventario adicional **de solo lectura** del entorno Python, GPU y dependencias concretas; no cargar modelos todavía.
- 2C-2: añadir pruebas offline para autorización, tiempos, idempotencia, rutas, bloqueo y fallo seguro.
- 2C-3: implementar runner desconectado del Bridge; **dry-run** sin GPU ni creación de videos.
- 2C-4: revisar resultados del dry-run y habilitar **una sola** ejecución predefinida.
- 2C-5: validar artefacto y transferencia privada; solo entonces evaluar integración con Studio OS.

## Criterios de decisión
**Aprobado preflight** no equivale a **aprobado render**. No introducir una acción de inferencia en `bridge.py` antes de superar 2C-1 a 2C-3.

## Resultados 2C-1 (Issue #15)
- Bridge Python: `/usr/bin/python3`.
- Detectados: `torch=2.8.0.dev20250319+cu128`, `torchaudio=2.6.0.dev20250319+cu128`, `torchvision=0.22.0.dev20250319+cu128`, `numpy=2.1.2`.
- No detectados en **ese intérprete**: diffusers, transformers, accelerate, safetensors, librosa, imageio y opencv-python. Esto no prueba ausencia en otros entornos.
- FFmpeg, FFprobe y nvidia-smi disponibles; scripts y pesos existen; ningún modelo cargado.
- Evitar instalar dependencias globalmente hasta identificar compatibilidad real; el intérprete PyTorch actual es una compilación de desarrollo CUDA 12.8.

## Avance 2C-2 / 2C-3: contrato offline (sin ejecución)
- `tools/runpod/render_dry_run.py`: solo genera un plan fijo en memoria; no tiene llamadas a subprocess ni al Bridge, no crea directorios, no importa PyTorch. La salida de ejemplo no autoriza inferencia.
- `tools/runpod/test_render_dry_run.py`: pruebas de rechazo de comandos adicionales, suplantación de usuario, IDs incorrectos y solicitudes repetidas.
- Los valores de tiempo, salida y huella son **una propuesta**: faltan locks persistentes y pruebas de cancelación. No introducir la acción `render` en el Bridge todavía.
