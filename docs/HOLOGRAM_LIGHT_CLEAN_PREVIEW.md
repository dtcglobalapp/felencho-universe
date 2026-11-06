# Hologram Light — rama limpia de verificación

## Contexto
Rama original: `feature/felencho-hologram-engine-v1` (commit de referencia `f5c9990028cc992f77fdfd63799c077710ec0889`).
Esta rama nace de `main` para aislar el experimento visual de 119 commits divergentes de la rama de investigación.

**No es producción. No publicar como personaje definitivo sin revisión visual.**

## Alcance
- `public/hologram-engine/engine.html` — visor Three.js sin UI de TV
- `public/hologram-engine/energy-entity.js` — volúmenes de energía, filamentos y anillos para Bob/Lina
- `/hologram-light/lina`, `/hologram-light/bob` — rutas separadas del laboratorio
- `tools/hologram/check-webgl-contract.mjs` — prueba estructural sin GLB, video o controles
- `tools/hologram/capture-light-preview.mjs` — Chromium/WebGL: captura las dos pantallas verticales
- `.github/workflows/validate-hologram-light.yml` — comprobación de fuentes, capturas y `next build`

## Estado, 6 de noviembre de 2026
- Vercel devolvió al menos un preview `READY` para esta rama (commit `b1a9f384...`).
- Los commits posteriores de QA todavía no cuentan con una validación final comprobada.
- Capturas visuales pendientes de inspección por Smart y aprobación por Felencho.
- La identidad es una interpretación artística luminosa, NO un rostro anatómico.
- El puente de voz experimental de la rama anterior sigue separado; no está conectado al camino activo LiveKit + Cartesia. Ninguna sesión LemonSlice debe iniciarse para probar este laboratorio.
- No se ha modificado `main` ni felencho.ai en producción.

## Criterio de salida
1. Imagen real de Bob/Lina en navegador aprobada por Felencho.
2. Código de QA y build sin errores.
3. Integración con sonido real del estudio (LiveKit + Cartesia), con audio por La Bestia y solo visuales por PCs Windows.
4. Control centralizado desde Studio Control y apagado seguro.
