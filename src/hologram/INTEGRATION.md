# Felencho Universe / felencho.ai — Next.js handoff

## Alcance y estado

El proyecto actual continúa en TanStack Start. No se convirtió a Next.js, no se publicó, no se añadió backend, login ni pagos. El módulo exportable es React, independiente del router; los ejemplos siguientes se crean **en el proyecto Next.js destino**, no aquí.

Se conservan shaders, geometrías, paletas, velocidades orbitales, Photo Core, Pure Energy, controles, fullscreen y encuadre 9:16. Photo Core es una textura fotográfica en una superficie ligeramente curvada, no una cabeza 3D ni una animación labial. Los experimentos anteriores siguen en la página de desarrollo actual, pero no forman parte de este handoff.

## 1. Archivos exactos que copiar

Copia estos archivos desde `src/hologram/` a `src/hologram/` en Next.js, manteniendo sus nombres y subcarpetas. Todos sus imports internos son relativos; no necesitan el alias `@/`.

```text
src/hologram/
  index.ts
  characters.ts
  engine.ts
  HologramEngine.ts
  lipSync.ts
  HologramStage.tsx
  HologramEntity.tsx
  LinaEntity.tsx
  BobEntity.tsx
  HologramPhotoCore.tsx
  PhotoCore.ts
  photoCoreStore.ts
  PhotoCorePanel.tsx
  profiles.ts
  ProfilePanel.tsx
  DevPanel.tsx
  PresenceScreen.tsx
  LinaScreen.tsx
  BobScreen.tsx
  HologramExperience.tsx
  useHologram.ts
  theme.css
  ui/Button.tsx
  ui/utils.ts
  INTEGRATION.md
```

`lipSync.ts` se conserva únicamente para no romper la API externa ya existente; no importa audios, IA, servidor ni paquetes extra. Photo Core no anima labios. `HologramEngine.ts` y `PhotoCore.ts` son entradas públicas estables; sus implementaciones son `engine.ts`, `HologramPhotoCore.tsx` y `photoCoreStore.ts`.

`profiles.ts` (galería de personajes) es framework-free: guarda nombre, identificador de voz, idiomas, especialidad, personalidad, ajustes visuales y fotografías (principal + opcionales por estado) en IndexedDB (`felencho-character-profiles`), con exportación/importación JSON (`format: "felencho-character-profiles"`, versión 1) para llevar perfiles a Felencho Universe. Un estado sin fotografía usa la principal; `HologramPhotoCore` precarga todas las fotos del perfil seleccionado y funde entre ellas (~0.6 s) sin pantallas negras. La galería solo administra identidades: la inteligencia y la conversación siguen en Felencho Brain.

No copies `LegacyFace.tsx`, `HoloFace.tsx`, `FacePanel.tsx`, `LipSyncPanel.tsx`, `faceGuide.ts`, `linaReference.ts`, `linaDemoCues.json`, `LIP_SYNC.md`, los audios de prueba ni `src/lib/face.functions.ts`. Tampoco copies `src/routes/*`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`, Vite ni la configuración de TanStack.

## 2. Dependencias

La versión base compatible es React 19 / React DOM 19, Fiber 9 y React Three Postprocessing 3. Si el proyecto principal tiene React 18, coordina primero su actualización; no instales una segunda copia de React.

```bash
npm install three@^0.187.0 @react-three/fiber@^9 @react-three/postprocessing@^3 postprocessing@^6.39.6
npm install lucide-react@^0.575.0 @radix-ui/react-slot@^1.2.4 class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.5.0
npm install -D @types/three@^0.187.0
```

React, React DOM y sus tipos son los del proyecto Next. Los paquetes de la segunda línea mantienen exactamente los controles actuales. No se requieren drei, TanStack, AI SDK, Zod, servicios de avatar ni claves API.

Para preservar las clases existentes se necesita Tailwind CSS 4. En un Next que aún no lo tenga:

```bash
npm install -D tailwindcss@^4 @tailwindcss/postcss@^4
```

En `postcss.config.mjs`, integra el plugin sin reemplazar otros necesarios:

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

Para reproducción exacta de dependencias, usa las versiones resueltas del lockfile de este proyecto y bloquea las mismas en el destino. Los rangos anteriores no garantizan idénticas versiones futuras.

## 3. Estilos y fuentes

En `src/app/globals.css`, antes de cualquier selector:

```css
@import 'tailwindcss';
@import '../hologram/theme.css';
@source '../hologram';
```

Si tu CSS vive en `app/` y no en `src/app/`, ajusta las dos rutas. No dupliques el import de Tailwind si ya existe. Importa `globals.css` una sola vez desde el layout raíz. Las pantallas necesitan altura de viewport y fondo negro; el módulo ya define `.presence-screen` y `.presence-stage` con relación 9:16 y los mismos parámetros de cámara.

`theme.css` contiene los tokens globales originales y estilos del panel: importarlo afecta al tema general del destino. Si Universe tiene otro tema, aplica esos mismos tokens en un contenedor dedicado mediante una adaptación revisada; no cambies sus valores si quieres conservar este resultado visual. Prueba especialmente las variables `--color-*` si ya existe otro `@theme`.

Mantén Orbitron (500,700) y JetBrains Mono (400,600). Puedes cargar esas fuentes con `next/font/google` en el layout y asignarlas a `--font-display` y al estilo del panel, o conservar el enlace Google Fonts del proyecto actual en el `<head>` del destino. No uses `@import` remoto en CSS. Las pantallas del estudio no muestran texto.

## 4. Configuración de personajes

Crea `src/hologram-config.ts` en Next:

```ts
import type { CharacterOverrides } from './hologram/characters';

export const characters: Record<'lina' | 'bob', CharacterOverrides> = {
  lina: {
    name: 'LINA',
    // Opcional: URL de un archivo realmente disponible en tu proyecto.
    // defaultImage: '/portraits/lina.png',
    initialMode: 'photo-core',
  },
  bob: {
    name: 'BOB',
    // defaultImage: '/portraits/bob.png',
    initialMode: 'photo-core',
  },
};
```

Sin `defaultImage` ni foto guardada, se muestra energía; nunca se inventa un retrato. Puedes sustituir los comentarios por un import local: `import linaPhoto from './assets/lina.png'`, y usar `defaultImage: linaPhoto.src`. Un import estático de Next es un objeto; pasa **`.src`**, no el objeto completo.

`palette` es opcional y acepta `{ a, b, c, d }` como cadenas de color Three.js. Omítela para conservar exactamente:

| Personaje | a | b | c | d |
|---|---|---|---|---|
| LINA | #7a2cff | #ff2bd6 | #22e6ff | #2f6bff |
| BOB | #1f4bff | #ffb43a | #dfe8ff | #5fc8ff |

Los identificadores internos siguen siendo `lina` y `bob`; `name` cambia solamente el nombre mostrado/accesible, no la geometría. `initialMode` acepta `photo-core` o `pure-energy`.

**Privacidad:** no se añadieron las fotos originales a este módulo. Un archivo en `public/` o importado como asset suele ser descargable por cualquiera con su URL; el nombre oculto no lo protege. Usa esa opción solo si apruebas explícitamente esa visibilidad. Para conservar los originales privados sin backend, usa la carga local del panel. URLs externas necesitan permisos CORS para texturas WebGL; no configures una URL que no puedas cargar desde el destino.

## 5. Crear las vistas en Next App Router

El wrapper dinámico debe ser un **Client Component**; `ssr: false` no se declara directamente en un Server Component.

`src/app/presence/lina/HologramClient.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { characters } from '../../../hologram-config';
const LinaScreen = dynamic(
  () => import('../../../hologram/LinaScreen').then(m => m.LinaScreen),
  { ssr: false },
);
export default function HologramClient() {
  return <LinaScreen config={characters.lina} storage="local" />;
}
```

**Corrección de rutas relativas:** desde `src/app/presence/lina/`, llegar a `src/` requiere **tres** `../`; los imports anteriores llegan a `src/hologram-config` y `src/hologram`.

`src/app/presence/lina/page.tsx`:

```tsx
import type { Metadata } from 'next';
import HologramClient from './HologramClient';
const title = 'LINA — Felencho Universe Studio Presence';
const description = 'LINA en su esfera holográfica de energía con Photo Core.';
export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};
export default function Page() { return <HologramClient />; }
```

Para BOB, crea los mismos dos archivos en `src/app/presence/bob/`: cambia el import dinámico a `BobScreen`, el export a `m.BobScreen`, el JSX a `<BobScreen config={characters.bob} storage="local" />` y los metadatos a BOB. No uses `next/image` para la textura: el módulo carga el archivo con Three.js.

## 6. Pantalla de control y fullscreen

`src/app/hologram/HologramClient.tsx`:

```tsx
'use client';
import dynamic from 'next/dynamic';
import { characters } from '../../hologram-config';
const HologramExperience = dynamic(
  () => import('../../hologram/HologramExperience').then(m => m.HologramExperience),
  { ssr: false },
);
export default function HologramClient() {
  return <HologramExperience
    characters={characters}
    initialPersona="lina"
    storage="local"
    screenPaths={{ lina: '/presence/lina', bob: '/presence/bob' }}
  />;
}
```

Crea `src/app/hologram/page.tsx` con ese wrapper y metadatos propios como en el ejemplo de LINA. Abre `/hologram?dev=1` para controles; el botón ◈ o D alternan el panel. El botón Studio fullscreen display activa `?display=1` y solicita fullscreen; Escape restaura controles. iPhone/Safari puede no admitir fullscreen del documento: sigue funcionando el modo limpio dentro del navegador, sin garantizar que desaparezcan las barras del sistema. El fullscreen real requiere una acción del usuario; no puede imponerse al abrir una URL.

Las rutas `/presence/lina` y `/presence/bob` no muestran controles; usa el panel para aplicar cambios y vuelve a la pantalla. El panel sigue **sin control de acceso**: no lo expongas como si fuera administración protegida.

## 7. Almacenamiento dual y prioridad

`storage="local"` (predeterminado): IndexedDB `felencho-private-photo-core`, almacén `portraits`, con imagen/configuración actual y anterior por personaje. Una carga nueva queda en borrador; Vista previa no reemplaza la aplicada; Aplicar escribe primero y luego activa; Descartar y Restaurar mantienen la funcionalidad actual. Si falla el guardado, se conserva el borrador y se informa en el panel.

`storage="memory"`: no lee ni escribe IndexedDB. Las cargas, ajustes, vista previa, aplicar y restaurar funcionan en memoria; se pierden al recargar, y entonces se usa otra vez el default del proyecto. Si IndexedDB no abre en modo local, las imágenes por defecto siguen disponibles; el panel notificará si después no puede guardar.

Prioridad: **borrador en vista previa → configuración local aplicada → configuración/default inicial del proyecto → energía sin foto**. Un modo Pure Energy guardado localmente también gana sobre `initialMode="photo-core"`. Los defaults se inicializan una vez por personaje y no sobreescriben cambios del usuario; para cambiar defaults durante una sesión, remonta tras recargar o usa el panel. Elige un único modo de almacenamiento para todas las vistas de esa instancia.

Cambiar de dominio/origen (preview → felencho.ai) no mueve IndexedDB. Debes cargar los originales una vez en el nuevo navegador/origen, o configurar defaults aprobados. Las fotos usadas en las comprobaciones de Lovable no se instalaron en los navegadores del estudio.

## 8. API y conexión futura

La API aparece después de montar y preparar la pantalla. Espera a que exista antes de enviar datos:

```ts
import type { FelenchoHologramAPI } from './hologram/HologramEngine';
const host = window as unknown as { FelenchoHologram?: FelenchoHologramAPI };
host.FelenchoHologram?.setState('speaking');
host.FelenchoHologram?.pushAudio({ level: .7, bass: .4, mids: .6, treble: .3 });
host.FelenchoHologram?.watch({ x: .2, y: -.1, intensity: .8 });
```

Estados: `idle`, `listening`, `thinking`, `speaking`, `watching`, `sleep`. Audio: valores finitos 0–1, enviados a 30–60 Hz desde tu reproducción real; `watch` usa x/y normalizados −1–1. `watch` inclina la escena cuando el estado es `watching`. Los alimentadores de producción deben enviar datos válidos, no NaN/Infinity. No hace falta micrófono ni cargar MP3.

También se conservan `getState`, `setSimulator`, `setPersona` y la API histórica `lipSync`. `setPersona` no sustituye el personaje de una pantalla fija LINA/BOB. La instalación es compartida y se limpia al desmontar el último consumidor; no llames al instalador cada frame. Si lo instalas manualmente, conserva y llama a la función de cleanup.

Hay una API y un motor singleton por ventana. **Monta una sola escena activa por ventana**: dos escenas simultáneas compartirían audio/estado y avanzarían el mismo reloj dos veces. Para las dos TVs abre una ruta por pantalla/ventana. Si las incrustas con iframes, cada iframe tiene su propio motor. El bridge postMessage histórico reconoce `source: 'felencho'` pero no valida origen; no es un canal autenticado. No lo uses en un entorno con emisores no confiables sin agregar una lista de orígenes permitidos en el destino. Esta preparación no conecta LiveKit ni Felencho Brain.

## 9. Verificación antes de desplegar el destino

1. Instalar y bloquear dependencias; ejecutar el build de **Next destino** y confirmar ausencia de importación de TanStack/IA.
2. Abrir LINA y BOB por separado sin datos locales: con defaults aprobados debe verse cada foto; sin ellos, energía, nunca un rostro inventado.
3. Cargar originales en el panel, Vista previa, Aplicar; recargar y confirmar ambas imágenes independientes.
4. Probar Pure Energy, Descartar y Restaurar; repetir con `storage="memory"` y confirmar que una recarga borra los cambios temporales.
5. Confirmar API, speaking/audio y watching/atención; comprobar fullscreen limpio y Escape.
6. Revisar 9:16, fondo, órbitas y Photo Core en PC, iPhone/Safari y TVs físicas. Las fotografías deben estar disponibles desde el origen destino.

En el proyecto actual se ejecutaron las pruebas automatizadas de Photo Core, API, lip-sync histórico y rutas; los resultados y la comprobación visual se documentan en `roadmap.md`. El proyecto Next principal no fue modificado ni ejecutado aquí: su build, posibles conflictos de tema y el rendimiento en dispositivos reales se verifican después del traslado.