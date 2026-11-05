# Felencho Hologram Engine — V1 (experimental)

## Objetivo
Sistema independiente con **Three.js/WebGL** (motor 3D), **Web Audio API** (audio real),
y **visemas opcionales con marca de tiempo**, para los dos personajes holográficos
aprobados en la fotografía del estudio. No copiar código ni recursos de Sylenia.

## Implementado en esta rama
- `/hologram-engine/bob` y `/hologram-engine/lina` — páginas independientes.
- Escenario Three.js real con iluminación, órbitas, partículas y escena reactiva.
- Carga local de WAV/MP3. La fuente de audio alimenta AnalyserNode
  **y el mismo AudioContext de salida**: no es un temporizador aleatorio.
- RMS, graves, medios y agudos. Fallback fonético **aproximado**, nunca anunciar
  como reconocimiento real de fonemas.
- Entrada opcional JSON de visemas `[{ "time": 0.0, "viseme": "REST" }, { "time": 0.2, "viseme": "A" }]`.
- Cargador glTF/GLB y asignación básica de nombres de morph targets a visemas.
- Sin sesiones LemonSlice, HeyGen, LiveAvatar, MuseTalk, RunPod ni micrófonos.

## Lo que NO está terminado
- **Faltan modelos GLB 3D aprobados** que coincidan con Bob y Lina de la fotografía.
- `/public/holograms/bob.glb` y `/public/holograms/lina.glb` no se han añadido.
- Solo si existe video local (`/public/videos/bob.mp4` o `lina.mp4`),
  se presenta como **modo compatibilidad 2D**, sin afirmar animación de boca real.
- Faltan rigs faciales verificados, alineación fonética automática, TTS definitivo,
  conexión Brain, sincronización distribuida entre PCs y pruebas en TVs.
- Tres.js y GLTFLoader se importan desde `esm.sh` fijando 0.180.0.
  Requiere conexión a ese CDN para ejecutar la prueba; antes de producción
  migrar a dependencias locales con lockfile y verificar licencias.
- No se verificó todavía `next build` ni calidad/fluidez en La Bestia.

## Probar
Desde una copia de la rama `feature/felencho-hologram-engine-v1`:
```sh
npm ci
npm run dev
```
Abrir:
- `http://localhost:3000/hologram-engine/bob`
- `http://localhost:3000/hologram-engine/lina`

La escena funciona aunque el modelo falte, pero presenta un aviso de
**personaje no instalado**. NO usar esa pantalla en el podcast.
Carga un WAV/MP3 local y pulsa reproducir para medir la reactividad
sin servidores de animación. Si se carga un GLB riggeado con blendshapes
compatibles (p. ej. `viseme_aa`, `viseme_oh`) se anima la boca.
Los nombres actuales son un primer adaptador, no integración final de un rig.

## Política de calidad
No llevar a las TVs hasta que los rostros coincidan con la referencia
aprobada, exista rig facial probado, audio/visemas sean temporizados,
y se haya validado rendimiento. Sin alterar rutas antiguas de Presence.

## Seguridad
Prototipo experimental solo en rama; no fusionar ni promocionar
a producción sin revisión. Evitar subir imágenes privadas o voces
sin autorización. La fotografía del estudio se usa como referencia
de diseño, no como malla 3D ni activo redistribuido.
