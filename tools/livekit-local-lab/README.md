# LiveKit Server local — Felencho Mundial (lab independiente)

Este laboratorio **no cambia** `.env.local`, `app/api/live/*`, `agents/lina/*`, audio Cartesia, hologramas ni los Sentidos actuales.

## Instalar y arrancar (La Bestia)
En una nueva terminal, NO en la terminal donde corre Next.js:

```bash
cd ~/Documents/felencho-hologram-check
git pull --ff-only
brew install livekit
bash tools/livekit-local-lab/start-mac.sh
```

El proceso **permanece abierto en esa terminal**. Esta prueba usa `livekit-server --dev`, que por defecto escucha en `127.0.0.1:7880` con claves `devkey` / `secret`. **NO exponer a Internet, ni publicar claves de desarrollo en GitHub.**

En otra terminal:

```bash
cd ~/Documents/felencho-hologram-check
bash tools/livekit-local-lab/check-mac.sh
```

El chequeo solo verifica puerto HTTP y creación local de JWT; **no prueba una sala WebRTC con media de dos participantes ni conexión del agente**. Si check-mac indica servidor accesible pero devuelve un código HTTP 404 en raíz, no necesariamente es fallo: lo importante es que responde el proceso. Para detener: vuelve a terminal donde corre LiveKit y pulsa `Ctrl+C`.

## Siguientes pruebas (NO listas)
1. Una página de cliente de prueba, exclusiva del laboratorio, pide token local y se conecta vía `ws://127.0.0.1:7880`, sin tocar las rutas de Cloud.
2. Streaming de audio Qwen3-TTS desde proceso local a una sala LiveKit autohospedada. Primero una muestra; después Bob/Lina.
3. STT offline, motor de lenguaje local y enrutamiento desde Felencho Brain; respetar controles de voz del productor y sentidos visuales.
4. Cuando se pruebe con PCs/TVs por LAN, necesitará otro modo de red y permisos seguros: NO abrir la interfaz dev con credenciales conocidas.
5. Prueba final de 45–60 minutos con conversación real, dos personajes, seguimiento de memoria autorizada y apagado seguro.

Fuentes: https://docs.livekit.io/transport/self-hosting/local/ ; https://github.com/livekit/livekit
