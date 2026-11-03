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

## Revisión adicional del contrato offline
- Tests de `test_render_dry_run.py` reforzados: incluyen saltos de línea reales con parámetros no permitidos y campos inesperados del objeto `user`; el validador ahora rechaza estrictamente ambos.
- **Pendiente de ejecutar en RunPod**: `python3 -m unittest discover -s tools/runpod -p 'test_*.py'` y `python3 tools/runpod/render_dry_run.py --issue-number 100`. No ejecutar `bridge.py --once` para este simulacro: no hay ni debe crearse una orden de render.
- El simulacro solo valida un contrato en memoria. Ni el rechazo de duplicados mediante un conjunto suministrado ni el tiempo máximo del plan implementan protección persistente o terminación real de procesos. Esos controles continúan pendientes.

## 2C — Registro persistente de solicitudes (experimental y DESCONECTADO)
- `tools/runpod/job_claims_offline.py` incorpora una base SQLite de reclamos persistentes, con transacciones `BEGIN IMMEDIATE` y un índice de exclusión para impedir más de un trabajo en estado `claimed`. La clave única del Issue impide repetir un reclamo tras un resultado terminal.
- `tools/runpod/test_job_claims_offline.py` verifica duplicados, contención, persistencia entre conexiones, estados terminales y casos inválidos. **No se ha ejecutado en RunPod todavía**.
- **Importante**: el registro no inicia procesos, no está conectado al Bridge, no consulta GPU y no realiza renders. Las pruebas crean bases de datos efímeras exclusivamente en directorios temporales; el simulador original sigue sin escribir archivos.
- Un fallo o reinicio durante `claimed` lo deja bloqueado: **no** existe recuperación automática. Se requiere conciliación manual del proceso y del artefacto antes de marcar `interrupted`, y jamás se reutiliza el mismo Issue.
- Pendiente una revisión separada de seguridad sobre ownership y permisos del directorio SQLite, protección ante symlinks, lock de procesos, cancelación, topes de recursos y salida privada. Estas garantías no se deben anunciar como implementadas por el solo hecho de existir el índice único.

## 2C — Ensayo de supervisor de procesos (solo pruebas offline)
- `tools/runpod/process_timeout_rehearsal.py` inicia **únicamente** dos fixtures Python integrados: uno termina al instante y otro espera 30 segundos. No admite comandos externos, entradas libres, shells, ni archivos del motor.
- El proceso de prueba se inicia en una sesión nueva; ante timeout se envía SIGTERM al grupo y, si no sale, SIGKILL. Las pruebas en `test_process_timeout_rehearsal.py` verifican salida normal, timeout y rechazo de entradas inválidas.
- **No** está conectado a `bridge.py`. Este ensayo no ejecuta GPU, no importa modelos y no constituye autorización de renderizado.
- Por verificar en ejecución: límites y comportamiento en el sistema real. Faltan comprobar grupos de procesos con nietos, bloqueos reales, finalización segura, límites de VRAM, validación MP4 y rutas privadas. No ampliar el Bridge con `render` todavía.

## 2C — Validador de video desconectado (offline)
- `tools/runpod/validate_artifact_offline.py` ofrece una primera verificación de MP4 con `ffprobe`: nombre de salida predefinido, sin enlaces simbólicos directos, máximo 60 MiB, duración 5.0 ± 0.25 s, un stream de video, dimensiones razonables, FPS y SHA-256.
- `tools/runpod/test_validate_artifact_offline.py` usa metadatos simulados. Las pruebas no renderizan ni crean MP4 real, y todavía están pendientes de ejecución en RunPod.
- **Importante**: no es validador de producción contra atacantes concurrentes. Falta endurecimiento contra condiciones TOCTOU/symlinks en directorios ascendentes, validación de códecs/fotogramas y permisos de salida. No conectar al Bridge ni habilitar ejecución por GPU.

## 2C — Inspección estática local de EchoMimic (read-only)
- `tools/runpod/inspect_echo_source.py` analiza con AST el archivo local fijo `experiments/echomimic_v3/infer_flash.py`, sin importar el módulo, cargar modelos ni ejecutar CLI. Reporta huella SHA-256, nombres de imports, flags de `add_argument` y líneas de paquetes simples de archivos de requisitos fijos.
- El Bridge admite solo la orden exacta `[FAE-RUNPOD] echo-source-inspect` con cuerpo `FAE_RUNPOD_JOB_V1\naction=echo-source-inspect` (dos líneas).
- El análisis no proporciona los defaults o valores de runtime ni acredita compatibilidad CUDA. Se debe contrastar con el entorno y revisar la fuente antes de escribir el comando de inferencia. No hay acción de render.

## EchoMimic: inspección #16 aprobada, siguientes argumentos
- El código local `experiments/echomimic_v3/infer_flash.py` fue inspeccionado estáticamente, SHA-256 `59cb489d5d661d4c518c0e185cb74c83c3e87cd06f4da6fdcce14d900c2d9bcd`.
- Imports detectados: torch, diffusers, transformers, librosa, safetensors, decord, omegaconf, moviepy, entre otros. El requirements específico declara `moviepy==2.2.1`, `tensorflow==2.15.0`, `diffusers>=0.30.1`, `transformers>=4.46.2`, `accelerate>=0.25.0`. No instalar la lista indiscriminadamente en el Python global que contiene PyTorch nightly CUDA 12.8.
- `tools/runpod/inspect_echo_cli.py` examina solo AST del archivo de código permitido para obtener valores por defecto, obligatoriedad y opciones literales de argparse. No importa el motor ni ejecuta inferencia. Orden GitHub exacta: título `[FAE-RUNPOD] echo-cli-inspect`, cuerpo de dos líneas `FAE_RUNPOD_JOB_V1` / `action=echo-cli-inspect`.
- Pendiente: verificar defaults con la ejecución real y dependencias en entorno aislado. El paso de inspección no activa renderizado.

## Issue #17: CLI de EchoMimic
- Inspección estática completada. Parámetros obligatorios: `--image_path`, `--audio_path`, `--prompt`.
- Defaults: `--video_length=81`, `--fps=25`, `--num_inference_steps=25`, `--sample_size=768 768`, `--weight_dtype=bfloat16`, `--GPU_memory_mode=sequential_cpu_offload`.
- **81 fotogramas a 25 FPS no representan 5 segundos**. Verificar semántica de video_length y restricciones de longitud antes de elegir número exacto.
- Modelo por defecto `Wan2.1-Fun-V1.1-1.3B-InP` y config `config/wan2.1/wan_civitai.yaml`. No asumir que todos los pesos auxiliares existen.
- Nuevo script de inspección `tools/runpod/inspect_echo_config.py`: solo presencia, tamaños, hash de archivos de configuración y nombres de claves de rutas fijas. No muestra valores, no llama GPU, no modifica motor.
- Nueva orden read-only: título `[FAE-RUNPOD] echo-config-inspect`, cuerpo dos líneas `FAE_RUNPOD_JOB_V1` y `action=echo-config-inspect`.

## Issue #18 — Resultado de inventario de componentes
- Presente: script `infer_flash.py`, imagen de Lina, WAV de 5.0 s y archivo Flash de pesos de 3,727,671,120 bytes.
- No presente **en las rutas examinadas**: `config/wan2.1/wan_civitai.yaml`, `experiments/echomimic_v3/flash/config.json` ni el directorio `chinese-wav2vec2-base`.
- No asumir ausencia definitiva: pueden existir rutas alternativas. Ninguna instalación ni inferencia se realizó.
- Nueva acción de exploración `[FAE-RUNPOD] echo-layout-inspect` con cuerpo exacto de dos líneas `FAE_RUNPOD_JOB_V1` / `action=echo-layout-inspect`. Script `inspect_echo_layout.py`, exploración acotada a directorios concretos, rutas relativas y nombres sin contenidos. No descargar ni modificar archivos.
- Aunque se encuentren alternativas, no lanzar GPU hasta verificar compatibilidad, rutas canónicas privadas, versión de dependencias y restricciones de seguridad.

## Resultado #19: los archivos estaban en un layout alternativo
- Localizado `experiments/echomimic_v3/config/config.yaml`.
- Localizados `experiments/echomimic_v3/flash/Wan2.1-Fun-V1.1-1.3B-InP/`, `flash/chinese-wav2vec2-base/` y `flash/transformer/config.json`; existencia de archivos no garantiza que los pesos/formatos sean compatibles.
- Hallado `experiments/echomimic_v3/venv/`, diferente del Python general. La ausencia previa de dependencias no implica que falten en ese entorno.
- Nueva acción de solo lectura `[FAE-RUNPOD] echo-venv-inspect` con cuerpo exacto `FAE_RUNPOD_JOB_V1` y `action=echo-venv-inspect` en dos líneas. `inspect_echo_venv.py` lee solo metadatos de distribuciones dentro del venv y presencia de rutas conocidas; **no ejecuta el intérprete** ni instala nada.
- El resultado se interpretará antes de elegir el modo de instalación o inferencia. Render GPU continúa deshabilitado.

## Issue #20: EchoMimic dispone de entorno Python independiente
- La inspección leyó **metadatos** de `experiments/echomimic_v3/venv/lib/python*/site-packages`. Existe `experiments/echomimic_v3/venv/bin/python` y es ejecutable; no se ejecutó.
- Versiones halladas: `torch 2.5.1+cu121`, `torchvision 0.20.1+cu121`, `torchaudio 2.5.1+cu121`, `diffusers 0.34.0`, `transformers 4.49.0`, `accelerate 1.15.0`, `safetensors 0.8.0`, `librosa 0.11.0`, `decord 0.6.0`, `moviepy 2.2.1`, `numpy 1.26.4`. También figuran `einops`, `omegaconf`, `pyloudnorm`, `opencv-python`, `imageio` y `mmgp`.
- Presentes (sin enlaces simbólicos): `experiments/echomimic_v3/config/config.yaml`, `flash/Wan2.1-Fun-V1.1-1.3B-InP/config.json`, `flash/Wan2.1-Fun-V1.1-1.3B-InP/configuration.json`, `flash/chinese-wav2vec2-base/config.json` y `flash/transformer/config.json`.
- **Decisión**: no instalar dependencias globales ni sobreescribir el venv. La presencia de paquetes como metadatos NO demuestra importabilidad, compatibilidad de CUDA o archivos completos de pesos.

### Barreras antes de autorizar el primer render
1. Comprobar el punto de entrada con el entorno anidado y validar en modo no-inferencia la importabilidad, sin iniciar modelos.
2. Revisar el `config/config.yaml` local y comprobar a qué rutas concretas resuelven las referencias de modelo; no asumir el default de config de otro directorio.
3. Determinar qué significa realmente `--video_length` para el modelo Wan/EchoMimic y cómo obtener aproximadamente cinco segundos a 25 FPS con la longitud válida; no escoger 125/126 fotogramas sin esa comprobación.
4. Aislar la salida por directorio privado con permisos y rutas seguras; revisar validación MP4 y protección contra cambios de archivos concurrentes.
5. Revisar el control real de tiempo, árbol de procesos y GPU. Los ensayos previos fueron offline, no una prueba de modelo.
6. Mantener el Bridge restringido a tareas de solo lectura; emitir autorización explícita y singular antes de agregar una acción real de render.

**Estado**: fase 2C de diagnóstico y pruebas offline. No hay MP4 generado ni inferencia ejecutada.

## Fase 2C — análisis de longitud de fotogramas (sin inferencia)
- Tras Issue #20 quedó confirmado el venv específico de EchoMimic con bibliotecas principales. No instalar paquetes globales.
- `tools/runpod/inspect_echo_frame_semantics.py` inspecciona mediante AST únicamente `experiments/echomimic_v3/infer_flash.py` y un archivo fijo candidato `experiments/echomimic_v3/src/pipeline_wan_fun_inpaint.py` si existe. Reporta referencias estructurales a `video_length`, `fps`, `num_frames` y `frames` sin ejecutar el código. El análisis puede ser incompleto y no garantiza que el motor admita una longitud específica.
- Nueva acción de Bridge de solo lectura: título exacto `[FAE-RUNPOD] echo-frames-inspect`; cuerpo exacto de dos líneas `FAE_RUNPOD_JOB_V1` y `action=echo-frames-inspect`.
- No hay acción render, descarga de modelos o escritura de archivos. El código debe pasar tests antes de procesar la orden.

## Issue #21: referencias exactas de duración pendientes
- 37 pruebas unitarias aprobadas. Inspección AST estática completada con script SHA-256 `59cb489d5d661d4c518c0e185cb74c83c3e87cd06f4da6fdcce14d900c2d9bcd`.
- `infer_flash.py` contiene asignaciones `video_length=args.video_length` (línea 175), `fps=args.fps` (línea 199), cálculo `video_length_actual=min(...)` (línea 343) y recorte de audio `audio_clip.subclipped(...)` (línea 409).
- **No deducir** número correcto de frames solo de `video_length/fps`. La fórmula y el recorte pueden modificarlo.
- Nuevo inspector `tools/runpod/inspect_echo_frame_formula.py` reporta expresiones estructurales de asignaciones relevantes y el recorte de audio; no ejecuta el motor. Orden GitHub exacta: título `[FAE-RUNPOD] echo-frame-formula-inspect`; cuerpo dos líneas `FAE_RUNPOD_JOB_V1` / `action=echo-frame-formula-inspect`.
- Permanecen pendientes el chequeo del venv real, aislamiento de salidas, bloqueo de procesos y validación privada antes de autorizar GPU.

## Issue #22 — fórmula exacta de longitud, confirmada por AST
- `video_length_actual=min(int(audio_clip.duration * fps), video_length)`.
- Después el motor aplica `((video_length_actual - 1) // vae.config.temporal_compression_ratio) * vae.config.temporal_compression_ratio + 1` (excepto el caso de un fotograma).
- Finalmente el audio se recorta mediante `audio_clip.subclipped(0, video_length_actual / fps)`.
- Con un WAV de 5.0 s a 25 FPS, hacen falta 125 fotogramas después del ajuste VAE. Que 125 sea válido depende de `vae.config.temporal_compression_ratio`; si este fuera 4, preservaría los 125, pero ese valor no está aún verificado.
- `frame_budget_offline.py` y `test_frame_budget_offline.py` calculan y prueban esta regla de forma puramente matemática; no importan ni ejecutan el motor. Se rechaza cualquier relación que recorte el audio. **El ratio usado en pruebas es ilustrativo, no una afirmación sobre los pesos locales.**
- Pendiente: identificar el ratio del VAE efectivamente utilizado y revisar si la salida puede durar exactamente 5 s. Mantener render deshabilitado.

## Tras 47 pruebas: inspección VAE y streaming separado
- RunPod reportó 47 pruebas OK en el último checkout. `live_cohost_state_offline.py` y sus cinco pruebas validan lógica de turnos y presencia en memoria; **NO** streaming real ni silenciamiento de audio externo.
- `tools/runpod/inspect_echo_vae_ratio.py` consulta solo ubicaciones fijas de configuración del EchoMimic local, buscando un valor numérico literal `temporal_compression_ratio`. No carga modelos ni ejecuta GPU. Su resultado puede ser inconcluso si el ratio está definido en código o en otro archivo.
- Contrato GitHub exacto: título `[FAE-RUNPOD] echo-vae-ratio-inspect`; cuerpo `FAE_RUNPOD_JOB_V1` y `action=echo-vae-ratio-inspect` en líneas separadas.
- La fase 3 de cohosts continuos está definida en `LIVE_COHOST_ARCHITECTURE.md`; los requisitos de podcast de varias horas no son limitaciones del clip de cinco segundos. No afirmar streaming o estabilidad multi-hora como implementados.

## Resultado Issue #23 — ratio del VAE en configuración
- 48 pruebas RunPod OK, Issue #23 cerrada.
- `experiments/echomimic_v3/config/config.yaml` declara `temporal_compression_ratio: 4` en línea 11 (SHA256 `21fe4409b664385a1c1cc5c23d92506ffb05ef3c374a18de9df67b715dca07e9`).
- Localizado `experiments/echomimic_v3/flash/Wan2.1-Fun-V1.1-1.3B-InP/Wan2.1_VAE.pth` (507,609,880 bytes).
- Matemáticamente 125 fotogramas a 25 FPS preservan los 5 segundos si el VAE activo realmente usa ratio 4. El inventario no demuestra qué config consume el runtime.
- `inspect_echo_vae_wiring.py` examina AST del script local y el valor numérico de la config sin ejecutar motores ni divulgar valores sensibles. Nuevo contrato Bridge exclusivamente de lectura: título exacto `[FAE-RUNPOD] echo-vae-wiring-inspect`; cuerpo exacto en dos líneas `FAE_RUNPOD_JOB_V1` y `action=echo-vae-wiring-inspect`.
- Mantener el objetivo mayor de Bob/Lina presentes durante horas separado de esta prueba de video offline. No habilitar inferencia por el hallazgo del ratio.

## Issue #24 y puerta de preparación offline
- Issue #24 cerrada tras 49 pruebas OK. La inspección AST localiza `OmegaConf.load(config_path)` en línea 215 y `AutoencoderKLWan.from_pretrained(... additional_kwargs=OmegaConf.to_container(config[...]))` en línea 238, y asigna el VAE al pipeline en línea 288.
- El archivo `config/config.yaml` reporta ratio temporal 4; el resultado estático **no confirma** que ese sea el archivo `--config_path` de una futura ejecución.
- `lina_readiness_offline.py` y `test_lina_readiness_offline.py` crean una decisión en memoria que permanece bloqueada hasta corroborar identidad de script/config, ratio compatible, configuración efectiva, prueba de importación local, seguridad real de procesos, aislamiento de salida y autorización explícita de GPU.
- Este gate **no ejecuta ni habilita** inferencia incluso si todos los indicadores se marcan como verdaderos. Las pruebas son exclusivamente unitarias y deberán ejecutarse en RunPod.
- Próximo avance: validar la ruta efectiva `--config_path` en un preset fijo, realizar un smoke test importación en entorno aislado sin cargar pesos y someter supervisión y salida privada a pruebas adicionales.

## Tras 53 pruebas RunPod: preset fijo y rutas de solo lectura
- 53 pruebas unitarias completadas en RunPod, incluido `lina_readiness_offline.py`. PR #8 sigue en borrador, sin fusionar.
- `tools/runpod/lina_pinned_preset_offline.py` verifica las rutas *fijas* del script EchoMimic, la configuración `experiments/echomimic_v3/config/config.yaml`, imagen y WAV de Lina, pesos Wan VAE y Flash Transformer; comprueba hash de script/config, tamaños de archivos de referencia y rechaza enlaces simbólicos en la ruta relativa.
- `tools/runpod/test_lina_pinned_preset_offline.py` ejercita condiciones de bloqueo y un fixture aislado en directorios temporales. Las pruebas no ejecutan inferencia ni archivos originales del motor.
- La nueva comprobación **no está conectada al Bridge**, no crea outputs y nunca certifica `effective_runtime_config_verified`. El valor de `--config_path` de una futura ejecución deberá fijarse y validarse al implementar un runner separado, y no se autoriza GPU por una inspección de rutas.
- Los resultados deben revisarse antes de continuar con smoke tests de importación en el venv existente y pruebas de recuperación/cancelación y protección del MP4.

## Tras 57 pruebas — inspección real de preset fijo, solo lectura
- El conjunto completo pasó 57 pruebas unitarias en RunPod (sin GPU).
- `tools/runpod/lina_pinned_preset_offline.py` puede verificar los archivos del preset contra el árbol local existente; ahora el Bridge admite **solo** la orden `[FAE-RUNPOD] lina-preset-inspect` con cuerpo de dos líneas `FAE_RUNPOD_JOB_V1` / `action=lina-preset-inspect`.
- La inspección comprueba hashes de script/config, tamaño de imagen/WAV/modelos y ausencia de enlaces simbólicos en rutas de referencia. No abre archivos multimedia para generación ni carga modelos.
- La identidad de un archivo y la existencia de rutas no prueban que EchoMimic importe correctamente, ni que el VAE lea la configuración en inferencia; no aprobar GPU por este resultado.
- La orden sólo puede procesarse después de actualizar el Bridge y pasar su conjunto de pruebas; PR #8 sigue sin fusionarse.

## Issue #25 completada: preset fijo 9/9
- RunPod confirmó `preset_paths_verified_offline`: script, configuración, imagen, WAV, pesos VAE y transformer, directorios Wan, Wav2Vec y venv local, todos con los controles pertinentes aprobados. 58 pruebas unitarias OK.
- El informe aclaró `effective_runtime_config_verified=false` y `bridge_render_enabled=false`. No confundir presencia de archivos con inferencia operativa.
- Nuevo `tools/runpod/inspect_echo_imports.py`: lanza **exclusivamente** un intérprete Python fijo del venv anidado para importar cinco bibliotecas sin importar el motor ni cargar modelos. Usa `CUDA_VISIBLE_DEVICES=-1`, flags offline y tiempo máximo de 18 s; devuelve únicamente estados de módulos, sin trazas privadas.
- Acción explícita del Bridge: título `[FAE-RUNPOD] echo-import-smoke`; cuerpo exacto `FAE_RUNPOD_JOB_V1` y `action=echo-import-smoke` en dos líneas. **No activa GPU ni render**, pero a diferencia de inspecciones AST sí ejecuta imports en un proceso hijo; estos pueden tener efectos internos de librería. No equivale a prueba CUDA.
- La prueba debe ejecutarse en RunPod y revisarse antes de decidir si alguna dependencia necesita atención. No modificar el venv ni instalar nada de momento.
