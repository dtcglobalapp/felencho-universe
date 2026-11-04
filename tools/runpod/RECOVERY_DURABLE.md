# RunPod Bridge — recuperación durable tras recrear contenedores

## Incidente 2026-11-04
El volumen montado en /workspace forzó los permisos 0777 para el directorio secreto y 0666 para el token incluso después de chmod. No usar ese volumen para secretos. La defensa que rechazó la credencial funcionó correctamente. Token anterior: revocar en GitHub inmediatamente si fue guardado allí y evitar reutilizarlo.

## Fuente de credenciales: RunPod Account Secrets

1. Generar un token GitHub fine-grained **nuevo**, restringido a dtcglobalapp/felencho-universe / Issues Read and Write / Metadata Read. No pegar en GitHub Issues ni código ni chat.
2. En el panel RunPod, crear un Account Secret llamado `FELENCHO_GITHUB` cuyo valor sea ese token. No mostrar su valor en logs ni terminal.
3. En las variables de entorno del Pod o su template, configurar exactamente:
   `FELENCHO_RUNPOD_GITHUB_TOKEN={{ RUNPOD_SECRET_FELENCHO_GITHUB }}`
   La sustitución del secreto es por RunPod al iniciar el Pod; actualizar el secreto requiere reiniciar la instancia para aplicar el valor nuevo.
4. El puente ahora lee primero la variable `FELENCHO_RUNPOD_GITHUB_TOKEN`. Si tiene un valor ausente o con placeholder sin resolver, aborta. Mantiene fallback *solo de compatibilidad* al archivo privado del HOME del contenedor; jamás se deben almacenar tokens en /workspace con permisos 0777/0666.
5. Eliminar el archivo legado `/workspace/.felencho-runpod-private/bridge-token` únicamente **después** de revocar el token comprometido y comprobar que la nueva variable de entorno funciona. Nunca imprimirlo para diagnosticar.

## Arranque automático
Se incluyó `tools/runpod/boot_bridge.sh`. Requiere la variable inyectada, verifica que existe el código en /workspace y utiliza `flock` para evitar procesos duplicados. No actualiza Git, no ejecuta modelos, no imprime secretos y no toca los archivos de EchoMimic o MuseTalk.

**Atención**: la llamada al launcher debe integrarse en el *startup hook o template real* del Pod. No sustituir a ciegas el comando de inicio del contenedor porque podría desactivar Jupyter/SSH. Dependiendo de la imagen RunPod, el startup puede soportar /post_start.sh, un CMD personalizado o una imagen Docker propia. Determinar el hook correcto y comprobar primero que SSH y Jupyter siguen funcionando. El archivo por sí solo NO asegura el inicio automático.

## Verificación sin imprimir secretos
1. Comprobar la presencia mediante `test -n "$FELENCHO_RUNPOD_GITHUB_TOKEN" && echo 'Secret presente' || echo 'Secret ausente'`; no usar `env` ni `printenv` del valor.
2. Ejecutar las pruebas unitarias `python3 -m unittest discover -s tools/runpod -p 'test_*.py'`.
3. Ejecutar `python3 tools/runpod/bridge.py --once` y comprobar desde GitHub el cierre de la Issue #29.
4. Configurar después el arranque automático de `boot_bridge.sh` de acuerdo con la imagen del Pod y verificar tras un reinicio controlado.
5. No ejecutar render hasta superar los gates de Fase 2C.

**Alcance**: los permisos inseguros del volumen requieren también revisar si otros secretos se guardaron en /workspace. No relajar los controles de propiedad/archivos del bridge.


## Sidecar opcional preparado (4 noviembre 2026)
- `tools/runpod/start_bridge_sidecar.sh`: **solo si el hook real de la imagen es compatible**, realiza preflight y lanza `boot_bridge.sh` como proceso independiente mediante `nohup`. No ejecuta modelos ni cambia el entrypoint.
- No utilizar este archivo como `Docker CMD` o `startCommand` único: reemplazaría el arranque original y arriesgaría SSH/Jupyter. Primero inspeccionar la pestaña **Template** y el entrypoint real del Pod. El script aún NO está instalado en el Pod ni verificado mediante reinicio.
- `test_bridge_sidecar_offline.py` comprueba sintaxis y ausencia de operaciones destructivas; las pruebas no equivalen a recuperación real.
- Criterio de aceptación **obligatorio**: secreto vinculado desde RunPod, servicios SSH/Jupyter intactos, `bridge.py --once` responde a Issue #29, un único trabajador tras dos reinicios controlados, sin ningún comando repetitivo requerido al dueño.
- La ejecución sin terminal desde ChatGPT seguirá dependiendo de que el Bridge pueda recibir las instrucciones. El primer enlace de secreto y hook es un trabajo de instalación única, no algo que se haya resuelto por haber creado este script.
