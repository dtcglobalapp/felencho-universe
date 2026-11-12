# Laboratorio local: dos participantes + muestra Qwen3 Serena

Separación de puertos: LiveKit `ws://127.0.0.1:7880`, web local `http://127.0.0.1:7890`. El puerto 7881 queda libre para el transporte RTC TCP de LiveKit. Todo es localhost; claves `devkey/secret` solo para desarrollo. No exponer a LAN o Internet.

**Aislado:** no cambia .env.local, rutas Cloud, Cartesia, agentes, Felencho Brain ni hologramas. La muestra se lee en modo solo lectura de `~/felencho-qwen3-tts-lab/output/lina-es/audio_000.wav`, sin subirla a GitHub. Ningún TTS en tiempo real está conectado: se reproduce un WAV ya generado.

## Pasos

1. Mantén LiveKit existente iniciado desde `tools/livekit-local-lab/start-mac.sh` en otra Terminal.
2. Detén **solamente el servidor web anterior** que ocupa el puerto 7881, usando Ctrl+C en su propia Terminal. No detengas LiveKit ni Next.js.
3. Actualiza exclusivamente el clon de pruebas y cambia a esta rama:
```bash
cd ~/Documents/felencho-livekit-webrtc-lab
git fetch origin
git switch -c feature/livekit-local-qwen-wav-lab --track origin/feature/livekit-local-qwen-wav-lab
cd tools/livekit-local-lab/webrtc-two
npm install
npm run build
npm start
```
4. Abre **dos pestañas** en `http://127.0.0.1:7890`. Conecta A en una y B en otra. En A pulsa `Transmitir WAV Serena`; en B debe aparecer `Pista recibida` y escucharse Serena. Usa auriculares; si Chrome bloquea audio automático, pulsa Play en B. El micrófono no necesita activarse para la prueba del WAV.
5. Pulsa Salir en ambas; confirma limpieza y sin errores.

### Criterios
- Ambos conectados; pista `serena-qwen-local-wav` publicada desde A y recibida en B.
- El WAV es audible de principio a fin y la transmisión termina sin bucles.
- No hay cambios en producción. Después de comprobar esto, se podrá investigar un adaptador de voz generado en vivo, sin declararlo integrado todavía.

No compartas tokens ni registros SDP completos; si falla, comparte únicamente los mensajes visibles en el recuadro de eventos y el error resumido del servidor.


## Segunda voz: Bob / Uncle_Fu

En el clon local ya situado en esta rama, actualiza con `git pull --ff-only` y recompila con `npm run build`. Detén solamente el servidor web `npm start` anterior mediante Ctrl+C en su Terminal; reinicia `npm start` en el directorio `tools/livekit-local-lab/webrtc-two`. No detengas LiveKit (7880). En `http://127.0.0.1:7890`, conecta A en una pestana y B en otra, micrófonos apagados. Desde A pulsa **Transmitir WAV Bob (Uncle_Fu)**; desde B comprueba pista recibida y audio audible. También sigue disponible Serena. No se modifica producción.
