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
