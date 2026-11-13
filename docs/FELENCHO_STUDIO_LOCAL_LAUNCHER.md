# Felencho Studio Lab — un solo control en La Bestia

Este panel es **experimental y exclusivo del Mac**. No reemplaza Felencho Brain ni Studio Control de producción. No cambia fotos, orbitas, voces existentes ni otras ramas.

## Instalacion inicial (solo una vez, en UNA Terminal)

```bash
cd ~/Documents/felencho-hologram-visual-test
git pull --ff-only
osacompile -o "$HOME/Desktop/Felencho Studio.app" tools/studio-local-lab/FelenchoStudio.applescript
open "$HOME/Desktop/Felencho Studio.app"
```

A partir de entonces, **doble clic en "Felencho Studio.app" en el Escritorio**. La app inicia en segundo plano su panel local si no esta funcionando y abre la interfaz http://127.0.0.1:7892 . No abre Terminal. Si macOS rechaza la app local, comprueba Privacy & Security y ejecuta de nuevo el comando de compilacion. No hace falta dar permisos de Administrador.

## Uso

- **Iniciar laboratorio**: inicia LiveKit 7880, Next.js 3001, laboratorio de voces 7890, puente 7891; no activa el microfono automaticamente.
- **Whisper mic (prueba) → Iniciar**: captura segmentos de 6 s por la entrada RODECaster Secondary indice 0 (confirmar indice AVFoundation antes de usar); detecta Bob y Lina y muestra LISTENING local. No responde preguntas. Haz clic en **Detener** para parar la captura.
- **Apagar servicios del panel**: solicita detener solo procesos que esta sesion del panel creo. Se incluyen los subprocesos de npm mediante grupos de procesos propios; no se ejecuta pkill ni se cierran puertos a ciegas.
- **Puertos externos**: el panel informa que el puerto ya esta ocupado, pero se niega a iniciarlo por duplicado o detenerlo.
- **Diagnostico**: registros en `~/Library/Logs/FelenchoStudioLab/`; si un servicio falla, revisar su log.
- **Apagar Mac**: detiene los procesos; el panel no se autoabre al iniciar sesion. Doble clic al preparar el estudio.

**Dependencias**: LiveKit Server instalado por Homebrew, Node.js y npm, repositorio con `node_modules`, laboratorio de voces local en `~/Documents/felencho-livekit-webrtc-lab/tools/livekit-local-lab/webrtc-two`. Si alguna ruta no coincide con la Mac, el panel muestra error y **no intenta crear ni sobrescribir carpetas**.

Este launcher funciona localmente solo en 127.0.0.1. No debe exponerse mediante tuneles, LAN ni Internet. Whisper y el bridge de escucha se ejecutan sin servicios externos. Ojo: Next.js y LiveKit pueden tener otras configuraciones de red, por lo que no anunciar este conjunto como listo para produccion. Los servicios pueden necesitar tiempo antes de informar preparado; actualizar estado.

### Limitaciones conocidas

No se ha ejecutado en la Mac del usuario desde GitHub; el primer arranque esta pendiente de validacion. El inicio de Next.js puede necesitar verificacion del puerto 3001. La escucha STT por segmentos no es streaming, y la activacion LISTENING no es conversacion ni respuesta IA. La app creada por osacompile no esta firmada por Apple; es solo para uso local.
