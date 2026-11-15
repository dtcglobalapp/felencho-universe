# Felencho Brain Realtime Engine v1 — laboratorio aislado

**Rama:** `feature/felencho-brain-realtime-engine-v1`. No fusionar ni reemplazar los hologramas de estudio sin validacion real.

## Que incluye
- `/api/studio-realtime` (solo desarrollo localhost:3001 o 3002): NDJSON de Qwen/Ollama con eventos `ready`, `delta`, `sentence`, `complete`, `error`.
- `/studio-realtime-lab`: vista de prueba **solo texto**, con tiempos de primera llegada y total, mas boton Cancelar.
- Qwen local en `127.0.0.1:11434`; historial opcional, biblioteca de ciencia y recuerdos aprobados de La Bestia.
- **Aun NO hay TTS persistente, audio streaming, microfono ni LiveKit integrados a esta ruta.**
- El boton Interrumpir cancela una peticion de laboratorio; **no es barge-in de voz**.

## Ejecutar sin tocar el estudio en puerto 3001
Desde la copia del repositorio en la Mac, con un directorio de trabajo limpio:

```bash
cd ~/Documents/felencho-hologram-visual-test
git fetch origin feature/felencho-brain-realtime-engine-v1
git worktree add ../felencho-realtime-lab origin/feature/felencho-brain-realtime-engine-v1
cd ../felencho-realtime-lab
npm install
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Abrir `http://127.0.0.1:3002/studio-realtime-lab`. No detener Studio Control ni las TVs.

Si `git worktree add` indica que la ruta ya existe, revisarla antes de repetir; no eliminar ni sobrescribir carpetas.

## Protocolo de pruebas
1. Confirmar Ollama en `http://127.0.0.1:11434/api/tags` y modelo Qwen cargado.
2. Elegir Bob, ejecutar una pregunta corta dos veces (la primera puede incluir carga inicial del modelo).
3. Registrar primer fragmento y tiempo total en milisegundos; repetir con Lina.
4. Iniciar una respuesta larga y pulsar Interrumpir: debe cesar el texto nuevo.
5. Probar fallos: Qwen detenido => error visible antes del limite de 35 s.
6. No afirmar menor latencia **audible** hasta implementar, medir y comparar un TTS persistente.

## Siguiente fase
Conservar Serena, probar una sola voz masculina estable para Bob y desarrollar un worker local TTS con cola unica, fragmentos, interruptores de cancelacion y medicion de primer audio. No generar audio Qwen simultaneamente en dos procesos antes de medir memoria.

## Prueba 15/11/2026: latencia hablada
Resultados comunicados por Felencho en la Mac M4 Max:
- Whisper 0.41 s
- Primer texto Qwen 0.23 s; Qwen completo 0.93 s
- Qwen3-TTS generado por petición 8.36 s
- Primera voz audible (desde fin de pregunta) 9.70 s
- Voz Bob Ryan

### Worker persistente experimental (puerto 7894)
El código nuevo `tools/realtime-lab/persistent_tts.py` carga el mismo checkpoint Qwen3-TTS una sola vez con MLX-Audio y atiende peticiones en `127.0.0.1:7894`. No instala nuevas voces ni conecta TV o LiveKit.

En OTRA terminal de La Bestia:
```bash
cd ~/Documents/felencho-realtime-lab
git fetch origin
git checkout --detach origin/feature/felencho-brain-realtime-engine-v1
~/felencho-qwen3-tts-lab/.venv/bin/python tools/realtime-lab/persistent_tts.py
```
**Importante:** Si esta copia ya está en una rama local con cambios propios, no hagas checkout; usa `git pull --ff-only` sobre esa rama. El worker informa cuando termina de cargar el modelo. Si la instalación local de MLX-Audio difiere de la API documentada, revisar el error en terminal y no instalar paquetes ni reemplazar voces sin evaluarlo.

En el navegador abre `http://127.0.0.1:3002/studio-realtime-lab`, recarga la página y pregunta por micrófono dos veces. Compara el campo `Motor TTS`: `Qwen3-Persistent` significa modelo en memoria; `Qwen3-Per-Request` significa que el worker no estaba disponible y la prueba usó el método anterior. La segunda pregunta revela mejor la ganancia real por calentamiento.

No concluyas que hay ganancia de velocidad hasta medir la primera voz audible con ambas modalidades. No debe arrancarse el worker en paralelo con cargas altas de otros modelos sin comprobar la memoria disponible.

### Control y recuperación
El worker no es una tarea de producción ni un daemon. Para detenerlo usa Ctrl+C en su terminal. La API de voz tiene respaldo automático por petición. Si la prueba falla, el estudio en puerto 3001 sigue intacto.

## Fase siguiente: voz completa por segmentos (15 nov 2026)
`/studio-realtime-lab` ahora encola todos los eventos `sentence` de Qwen y los sintetiza uno por uno con Qwen3-Persistent (puerto 7894). El navegador reproduce cada WAV por orden. Se mide primera voz, cantidad de segmentos y pausa máxima entre frases.

El botón **Interrumpir** cancela la petición a Qwen, las solicitudes de TTS pendientes y el audio en reproducción. Se añadió un interruptor **experimental** de interrupción acústica mediante el micrófono; requiere micrófono del presentador **aislado** de las voces sintetizadas por mix-minus. Detecta sonido, **no autentica a Felencho**. No activar durante grabación oficial hasta verificar falsos positivos.

Limitaciones: el worker TTS persistente aún genera un WAV completo por segmento; todavía no entrega muestras PCM en tiempo real. La cola reduce solapamientos y mantiene Ryan/Serena, pero puede producir pausas audibles. El límite actual es de ocho segmentos por respuesta de ensayo. El laboratorio no está conectado a las TVs ni a LiveKit.

### Para probar
1. Con `7894/health` listo, actualizar la rama experimental y reiniciar únicamente Next.js en 3002.
2. Seleccionar Bob o Lina y preguntar por micrófono. Escuchar todas las frases, comprobar fragmentos reproducidos y pausa máxima.
3. Repetir la prueba y pulsar Interrumpir cuando la voz esté sonando: el audio debe cesar.
4. Solo después, activar el interruptor acústico con salida de la RØDECaster configurada como **micrófono aislado**. Hablar mientras Bob o Lina reproducen audio y comprobar la cancelación.
5. No llevar a producción ni asegurar latencia menor hasta pruebas auditivas reales. El tiempo de primer audio es inicio de `HTMLAudioElement.play()`, no tiempo de salida acústica medido por hardware.
