# Felencho Light — primera prueba en Next.js (aislada)

Esta rama NO modifica las rutas activas /hologram-local-lab, Studio Control ni LiveKit.

## Confirmaciones
- Tres archivos fuente instalados localmente en `vendor/felencho-light/src/assets/`: Bob JPEG, Lina JPEG y Lina SLEEP WebP.
- `tools/studio-light-lab/prepare-assets.sh` comprueba las huellas SHA-256 aprobadas (sin recomprimir), y copia a `public/studio-light/assets/`; nunca sobreescribe una versión diferente.
- Pantallas de ensayo `/studio-light/bob`, `/studio-light/lina`; `?dev=1` muestra panel de prueba. Los retratos se componen con shaders originales 2.5D de Lovable, sin boca artificial.
- Pantallas limpias sin audio por defecto. El audio WAV/MP3 solo se puede activar manualmente desde el laboratorio `?dev=1`. Evitar doble reproducción al Rodecaster.

## Instalación y compilación SOLO EN WORKTREE AISLADO
```sh
cd "$HOME/Documents/felencho-light-integration-lab" || exit 1
git fetch origin feature/felencho-light-presence-bridge-lab
git status --short   # imagenes sin versionar son esperadas
git merge --ff-only origin/feature/felencho-light-presence-bridge-lab
sh tools/studio-light-lab/prepare-assets.sh
npm ci
npm run build
```
El comando `npm ci` instalará dependencias solo en este worktree y `npm run build` comprobará la aplicación sin iniciar un servidor. Si falla, registrar el error y detener aquí. No usar comandos `git reset --hard`, `git clean`, ni `all-stop`.

## Prueba de navegador (después de build)
No arrancar el servidor de prueba sobre :3001, :3002, :3107, :7890, :7891, :7892, :7894 o :7880. Antes de arrancar servicio aislado, confirmar un puerto libre y acordar prueba controlada. Las rutas nuevas SOLO existen en el worktree, NO en el proceso Next ya activo en :3001. Las TVs no tienen aún acceso LAN a estas pantallas.

## Límites conocidos
- El puente SSE existente `/api/studio-light/events?persona=bob|lina` escucha eventos antiguos del wake-bridge 7891, no recibe audio real de Brain.
- `Felencho Brain` NO ha sido conectado. Falta traducir transiciones reales del Director de Turnos y señal de audio que ya se reproduce una vez por La Bestia.
- La conexión a 7891 es local al Next server en la Mac; no expone el bridge del sistema directamente a la PC TV. No hay autenticación de los eventos de Brain futuro.
- El editor Lovable reportó pruebas, pero **esta adaptación Next.js todavía no tiene compilación ni pruebas verificadas en La Bestia**. No suponer que funciona hasta `npm run build` y prueba Chrome.
