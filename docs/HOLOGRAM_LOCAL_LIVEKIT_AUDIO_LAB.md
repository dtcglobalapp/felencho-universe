# Laboratorio aislado: audio LiveKit -> hologramas 3D

**Rama**: `feature/hologram-local-livekit-audio-lab`. No modifica rutas de pantalla, Photo Core, perfiles, Cartesia, Felencho Brain ni producción. Las fotos aprobadas permanecen en IndexedDB del origen local del navegador. No publicar este laboratorio en internet.

## Requisitos

- LiveKit local en `127.0.0.1:7880`, ya validado.
- Servidor web de WAV local en `127.0.0.1:7890`, rama `feature/livekit-local-fresh-phrases-lab`, ya validado.
- Carpeta independiente de Next en `~/Documents/felencho-hologram-visual-test`, con perfiles de Bob y Lina importados en Chrome para `localhost:3001`.

## Arranque en La Bestia

Con el servidor Next en puerto 3001 detenido (Ctrl+C en **su propia Terminal**, sin detener LiveKit ni la web 7890):

```bash
cd ~/Documents/felencho-hologram-visual-test
git fetch origin
git switch --track origin/feature/hologram-local-livekit-audio-lab
npm run dev -- --port 3001
```

Mantener abiertos 7880, 7890 y 3001. Abrir tres pestañas en Chrome del mismo Mac:

- `http://localhost:3001/hologram-local-lab/lina`
- `http://localhost:3001/hologram-local-lab/bob`
- `http://127.0.0.1:7890/` (laboratorio emisor, conectar **como A**).

En cada vista holográfica pulsar **Conectar**. Pulsar en la pestaña 7890 **Transmitir frase nueva Lina**; Lina debe reaccionar con SPEAKING y movimiento de anillos; Bob debe permanecer IDLE. Al terminar, Lina retorna a IDLE. Repetir invirtiendo personajes con **Transmitir frase nueva Bob**. No activar micrófonos. Las vistas holográficas no reproducen audio (evitan ecos); si se desea escuchar simultáneamente, abrir otra pestaña 7890 y conectar **como B**.

## Restricciones y criterios de aceptación

El servidor Next solo permite obtener credenciales locales durante `NODE_ENV=development` y desde el host `localhost:3001` o `127.0.0.1:3001`, consultando el laboratorio de pruebas en 7890. El visualizador ignora identidades que no comiencen por `a-` y pistas que no comiencen por `serena-` para Lina o `bob-` para Bob; no publica audio ni micrófono. Las pantallas de estudio originales y producción continúan intactas.

Verificar: 1) los retratos originales permanecen; 2) las dos conexiones muestran estado conectado; 3) Lina responde SOLO a Serena, Bob SOLO a Uncle_Fu; 4) SPEAKING/IDLE cambia con el nivel real de audio y 5) ambos conservan sus anillos, brillo y energía. Esta prueba sigue usando WAV generados por lote; no presume sincronización labial, conversación inteligente ni generación de voz en tiempo real.

En caso de fallo, copiar el mensaje de estado de cada página y la Terminal de Next, evitando volcar logs completos o tokens.
