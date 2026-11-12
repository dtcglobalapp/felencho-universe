# Dos participantes WebRTC — laboratorio local aislado

**No integra Qwen3-TTS todavía.** Prueba conexión real de dos clientes y audio humano opcional. No cambia código, .env, Cloud, Cartesia, Bob/Lina ni hologramas.

## Mac
Mantén el servidor LiveKit existente escuchando en `127.0.0.1:7880`. En una **terminal nueva**:

```bash
cd ~/Documents/felencho-livekit-webrtc-lab/tools/livekit-local-lab/webrtc-two
npm install
npm run build
npm start
```

Abre `http://127.0.0.1:7881` en Chrome o Safari. En pestaña 1 pulsa **Entrar como A**; en pestaña 2 pulsa **Entrar como B**. Verifica mensaje `WebRTC conectado` y presencia del otro participante. Con auriculares, pulsa **Activar micrófono** en una pestaña para publicar la pista. En la otra debe aparecer `Pista recibida` y reproducirse el audio (si autoplay bloquea, pulsa play). Pulsa **Salir** en ambas al acabar.

El token se firma **únicamente en Node en localhost**, no en el navegador. Usa claves públicas de desarrollo `devkey/secret` y puerto local 7881: **nunca exponer a Internet o LAN**, ni usar en producción. No instalar npm en la raíz del repositorio. Cada pestaña usa identidad aleatoria propia.

## Aceptación
1. LiveKit `check-mac.sh` devuelve HTTP 200.
2. A y B se conectan a la misma sala `felencho-local-test`.
3. Ambos ven al otro en los logs.
4. Audio opcional: el remoto recibe pista y escucha audio.
5. Salida/desconexión sin afectar proceso anterior.

Si falla, comparte el log del navegador y salida de Terminal, sin pegar tokens. Próximo hito: publicación de un WAV Qwen3-TTS mediante cliente dedicado al mismo servidor local.
