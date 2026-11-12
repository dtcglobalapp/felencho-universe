# Felencho Mundial — verificación de audio-reactividad y siguiente fase STT (laboratorio)

## Punto de partida comprobado por Felencho, 12 noviembre 2026
Rama anterior `feature/hologram-local-livekit-audio-lab` commit `8c7d94c`: Bob y Lina cambiaron efectivamente IDLE → SPEAKING durante la reproducción de sus propios WAV Qwen3-TTS transmitidos por LiveKit 1.13.11 → IDLE al acabar. No modificar ese punto de referencia.

## Nueva rama experimental
`feature/hologram-audio-meter-stt-prep`

Se añadió en cada holograma (solo la vista local con controles) un medidor de audio derivado del `AnalyserNode` del Web Audio API, con bandas FFT y energía RMS de la señal de la pista remota ya suscrita. Los datos llegan al motor mediante `hologram.pushAudio`. Los indicadores muestran:

- **Audio real**: nivel actual 0–100%. Debe subir y bajar durante cada palabra y quedar en 0 tras finalizar.
- **Pico**: máximo observado durante la pista. Debe superar 0 si la señal contiene audio detectable.
- **Frames con sonido**: cantidad de cuadros de análisis con RMS > 0.002. Debe ser > 0 en una voz recibida.

Los cambios de estado SPEAKING/IDLE existentes se mantienen por presencia de pista para evitar regresiones ante el umbral espectral.

### Cómo verificar en La Bestia
Detener SOLO el proceso Next que ocupa 3001 (Ctrl+C en esa Terminal), sin cerrar LiveKit 7880 ni web WAV 7890.

```bash
cd ~/Documents/felencho-hologram-visual-test
git fetch origin
git switch --track origin/feature/hologram-audio-meter-stt-prep
npm run dev -- --port 3001
```

Abrir:
- `http://localhost:3001/hologram-local-lab/bob`
- `http://localhost:3001/hologram-local-lab/lina`
- `http://127.0.0.1:7890` — participar como A para enviar WAV.

Conectar las dos vistas y transmitir la frase de Lina, luego la de Bob. Comprobar que cada uno sigue conservando su propia cara, SPEAKING/IDLE y reacción de los anillos. Si **Pico 0% / Frames 0** durante toda la transmisión, no afirmar que hay audio-reactividad real solo porque la pista activa SPEAKING: investigar AudioContext y recepción PCM antes de continuar. El hecho de oír el WAV en una pestaña B separada no certifica análisis de audio en la ventana del holograma.

## Fase STT local (aún NO implementada)
No utilizar Web Speech Recognition suponiendo que sea offline, ya que el navegador puede utilizar servicios remotos. Próxima implementación debe escoger explícitamente un motor de transcripción local/offline compatible con macOS Apple Silicon, y validar sin red.

Arquitectura deseada:
1. Captura micrófono de Felencho, con consentimiento y dispositivo elegido, en laboratorio aislado.
2. STT offline con transcripción visible en pantalla privada; no enviar a servicios externos, no grabar ni subir a GitHub la voz.
3. Detección robusta de menciones a **Bob** y **Lina** (incluyendo variantes ASR) y activación LISTENING del personaje correspondiente; no asumir que otro estado interno de Felencho Brain existe.
4. Solo tras verificación de transcripción y wake words, construir turnos, interrupciones y TTS; no conectar ni alterar Felencho Brain/Cartesia/TV de producción hasta aprobación.

Mantener los 7 retratos/estados de cada personaje sin modificaciones. No publicar el laboratorio ni sus credenciales o datos privados.
