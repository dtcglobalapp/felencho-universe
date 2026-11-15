# FELENCHO MUNDIAL — Audición de Bob · 15/11/2026

**Objetivo:** comparar Eric, Aiden y Dylan en el Qwen3-TTS local ya iniciado, sin reiniciar puertos ni cambiar identidades de personajes.

## Puertas de seguridad
- Abrir Studio Control `http://127.0.0.1:7892` y desde ahí Realtime Lab `http://127.0.0.1:3002/studio-realtime-lab`.
- Confirmar Qwen3-TTS `7894` saludable mediante el indicador existente del panel, no ejecutando instalaciones.
- Usar **solo** voces que el servidor `/health` enumere. Si Eric, Aiden o Dylan no aparecen, registrar ausencia; no presuponer que el modelo/versión los soporta.
- Nunca cargar un audio de prueba al canal LiveKit de Bob, a la pantalla holográfica ni a la salida de transmisión; usar audición aislada.
- No tocar voz Serena de Lina; Ryan descartado.
- El antiguo `app/studio-conversation-lab/page.tsx` incluye `bobVoice = 'Ryan'`: esto debe revisarse **después** de que Felencho apruebe la nueva voz, en un cambio separado y validado.

## Texto único (español)
> Qué tal, Felencho. Soy Bob, y bienvenidos a Felencho Mundial. Hoy tengo una pregunta que parece sencilla, pero que merece una conversación seria. ¿Cómo distinguimos los hechos, las creencias y las opiniones? Escuchemos a Lina, revisemos las pruebas, y saquemos nuestras propias conclusiones. ¡Y que no falte el buen humor!

## Texto único (inglés)
> Welcome to Felencho Mundial. I'm Bob. Let's look beyond the headlines, ask better questions, and follow the evidence. Lina, what do you think? Felencho, the microphone is yours.

## Método comparativo
1. Mantener **exactamente** los mismos textos, modelo, parámetros de generación, volumen de reproducción y dispositivo de salida para cada candidato.
2. Guardar evidencia local (nunca en GitHub público): duración generada, tiempo a primer audio, tiempo total, errores, si voz estaba precargada o fría.
3. Escuchar primero sin mirar el nombre de la voz, si el panel permite identificar los archivos anónimamente.
4. Puntuar de 1 a 5: naturalidad del español, autoridad cálida, pronunciación, expresividad, inteligibilidad y calidad del inglés; anotar cortes y errores.
5. Pedir a Felencho que confirme **un** ganador para Bob. No aplicar la selección hasta tener su visto bueno.

| Candidato | Español natural | Autoridad cálida | Dicción | Expresión | Inglés | Notas |
|---|---:|---:|---:|---:|---:|---|
| Eric | — | — | — | — | — | Pendiente |
| Aiden | — | — | — | — | — | Pendiente |
| Dylan | — | — | — | — | — | Pendiente |

## Criterio final
Elegir la voz que mejor funcione para Bob como coanfitrión maduro, expresivo y reflexivo; la rapidez y la estabilidad importan, pero no justifican una voz poco natural. Tras la selección, separar una prueba técnica de integración y latencia antes de cualquier cambio en los personajes visuales.
