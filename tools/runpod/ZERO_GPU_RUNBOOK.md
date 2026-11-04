# Felencho Actor Engine — Protocolo cero GPU para recuperación de RunPod

**Objetivo:** dedicar las horas de alquiler exclusivamente a pruebas de animación. No realizar diagnósticos de autenticación o revisiones de código mientras la RTX 4090 está facturando.

## Estado verificado (4 nov 2026)
- Repositorio: `dtcglobalapp/felencho-universe`, rama `feature/actor-engine-runpod-control-v1`. PR #8 en borrador.
- La comunicación GitHub Issues #9/#10 funcionó anteriormente. Issue #29 no ha recibido respuesta confirmada.
- El volumen `/workspace` forzó permisos 0777/0666, incluso tras `chmod`: no es almacenamiento apto para credenciales.
- RunPod Account Secret `FELENCHO_GITHUB` creado por el propietario. **No está confirmada su vinculación a la variable del Pod.**
- Código Bridge admite `FELENCHO_RUNPOD_GITHUB_TOKEN` por variable de entorno. `boot_bridge.sh` está en la rama pero **no está conectado a un startup hook probado**.
- `cold_start_readiness.py`: comprueba exclusivamente la presencia de referencia resuelta y de rutas; no autentica contra GitHub, no usa GPU, no inicia procesos, ni lee valores de secretos.
- Todos los modelos y pesos locales de `/workspace/felencho-avatar-engine` deben preservarse. No hacer checkout/pull allí.
- Los 90 tests anteriormente aprobados fueron offline; las pruebas nuevas están pendientes de ejecutar/verificar.

## Antes de encender RunPod
1. En GitHub, revocar el token antiguo almacenado con permisos 0666; no copiarlo ni recuperarlo en texto plano. El secreto RunPod debe contener un token nuevo restringido a Issues del repositorio.
2. En la plantilla/edición del Pod, añadir la variable `FELENCHO_RUNPOD_GITHUB_TOKEN` y seleccionar mediante el icono de llave el secreto `FELENCHO_GITHUB`; verificar el enlace antes de reiniciar.
3. Confirmar qué comando de inicio usa la imagen actual. **No reemplazar** el entrypoint ni startup de SSH/Jupyter sin comprobarlo; el script `boot_bridge.sh` solo puede añadirse como proceso auxiliar compatible o mediante imagen personalizada revisada.
4. Definir un presupuesto de prueba y un procedimiento de apagado. Verificar precio real y cargos del almacenamiento. Si el Pod está detenido, no asumir que el mismo GPU quedará disponible tras reanudarlo.

## En una ventana corta de prueba, una vez que el Pod esté encendido
1. Sin imprimir la variable, ejecutar `python3 tools/runpod/cold_start_readiness.py` desde `/workspace/felencho-runpod-bridge`; si status blocked, no iniciar GPU inferencia ni regenerar tokens en terminal.
2. Ejecutar los tests unitarios del checkout actualizado; si falla alguno, apagar y arreglar en GitHub.
3. Ejecutar una sola vez `python3 tools/runpod/bridge.py --once`; Smart consulta Issue #29 y verifica cierre y respuesta.
4. Registrar evidencia de que `boot_bridge.sh` arranca como proceso auxiliar tras la siguiente recreación de contenedor **sin interrumpir SSH/Jupyter**. Sin esta prueba no llamar al arranque "automático".
5. Detener el Pod y seguir el desarrollo offline.

## Restricciones de costos y alcance
- **No** iniciar entrenamiento o inferencias de EchoMimic/MuseTalk hasta tener: comando fijo revisado, un solo trabajo concurrente, directorio privado fiable fuera de áreas 0777, kill group/timeout, validación MP4, idempotencia y autorización explícita.
- **No** poner secretos en GitHub Issues, README, logs ni mensajes.
- La variable de entorno protege el secreto mejor que el archivo 0666, pero un proceso con privilegios root dentro del contenedor podría inspeccionarla: limitar acceso al Pod y no registrar `env` ni `printenv`.
- Una GitHub App o un token corto renovable sería preferible más adelante a un token personal permanente.
- No mezclar Bridge con transporte WebRTC de Bob y Lina. El canal GitHub Issues es solo control.

## Actualización 4 nov: preflight en el mismo launcher

El script `tools/runpod/boot_bridge.sh --check` ejecuta únicamente `cold_start_readiness.py` y sale **sin iniciar demonio ni GPU**, con reporte redacted de comprobaciones (no imprime secreto). El modo por defecto `boot_bridge.sh` invoca el preflight primero y solo después intenta iniciar el sondeo bajo `flock`. Este launcher NO se auto-instala y debe engancharse a un hook compatible, revisado para no interferir con SSH/Jupyter. No prueba autenticación real de GitHub: la prueba completa seguirá siendo una solicitud de diagnóstico y lectura del Issue #29.

**Pendiente:** ejecutar las pruebas unitarias nuevas en un entorno adecuado y verificar el lanzamiento real tras vincular `FELENCHO_GITHUB` en la plantilla del Pod. No encender GPU únicamente para este trabajo.
