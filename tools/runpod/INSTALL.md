# Felencho RunPod Bridge — instalación y prueba (Fase 1)

**Estado:** experimental, sin despliegue en producción. No afecta a Presence, LiveKit ni LemonSlice. Esta fase únicamente devuelve diagnósticos; no puede lanzar inferencias, ejecutar comandos arbitrarios ni gestionar el ciclo de vida de RunPod.

## Diseño

- La comunicación utiliza Issues del repositorio `dtcglobalapp/felencho-universe`.
- Smart puede crear y consultar Issues mediante la integración GitHub existente.
- Un proceso pequeño en RunPod consulta los Issues pendientes (conexiones HTTPS salientes) y solo acepta el título exacto `[FAE-RUNPOD] diagnose`, cuerpo exacto definido en `bridge.py`, creador exacto `dtcglobalapp` y estado abierto.
- El único trabajo posible es ejecutar el diagnóstico **fijo** `tools/runpod/diagnose.py`, publicar un comentario y cerrar el Issue.
- No se abre puerto entrante. No se acepta shell remota ni texto de comandos desde Issues. El bridge ignora pull requests, Issues de terceros y otras órdenes.
- El token vive solo en RunPod en `/workspace/felencho-avatar-engine/.runpod-bridge-token`, con permisos 0600. No compartir el token en ChatGPT, capturas ni repositorios.

## Antes de instalar

1. Revisar la propuesta GitHub de la rama `feature/actor-engine-runpod-control-v1`. No fusionar ni desplegar en felencho.ai todavía.
2. Confirmar conectividad GitHub desde RunPod y cómo instalar archivos de la rama. Si el repositorio es privado, usar autenticación de GitHub mediante mecanismos oficiales; nunca colocar tokens en URLs.
3. Crear, en GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens, un token **solo para este repositorio**, con permiso **Issues: Read and write** (y `Metadata: Read` implícito). Definir una caducidad corta. No conceder permisos a otros repositorios. Una alternativa más robusta a largo plazo es GitHub App con token de instalación.
4. Verificar la instalación de `tools/runpod/bridge.py` y `tools/runpod/diagnose.py` en el Pod.
5. Ejecutar pruebas: `python3 -m unittest discover -s tools/runpod -p 'test_*.py'`.
6. Ejecutar `python3 tools/runpod/bridge.py --setup` directamente en una terminal segura del Pod. La entrada del token es oculta.
7. Ejecutar `python3 tools/runpod/bridge.py --once` y verificar que un Issue de diagnóstico de prueba recibe comentario y se cierra. **No iniciar el ciclo permanente antes de completar esta prueba.**

## Operación

Tras comprobar la fase de una sola ejecución, ejecutar el bridge dentro de un servicio gestionado o sesión tmux con políticas de reinicio y supervisión. No usar un runner GitHub Actions de propósito general en el Pod.

## Seguridad y límites

- La autenticación de GitHub confirma el autor de la orden pero no reemplaza una revisión de seguridad de acceso al repositorio.
- Cualquier persona o aplicación con control de la cuenta de GitHub autorizada podría crear un diagnóstico. El resultado puede incluir rutas/nombres de archivo, por lo que no se publicarán secretos ni archivos completos.
- GitHub Issues **no es transporte de audio ni video en tiempo real**. Este canal solo se usará para operación y orquestación; el futuro avatar vivo requiere otra conexión de media (WebRTC o equivalente).
- Antes de habilitar generación, añadir cola única, idempotencia robusta, límite de costo, parada segura, autenticación por trabajo y gestión privada de artefactos.
- La fase 1 no controla RunPod automáticamente hasta instalar el puente, configurar un token y comprobar su funcionamiento.
