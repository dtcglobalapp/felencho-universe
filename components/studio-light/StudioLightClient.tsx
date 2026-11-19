"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { createV3Controller } from "@/vendor/felencho-light/src/light/v3/speech";
import { createAudioPlayer, type AudioPlayer } from "@/vendor/felencho-light/src/presence/player";
import type { PresenceConfig } from "@/vendor/felencho-light/src/presence/config";
import { connectLocalWakeEvents, type LightCharacter } from "@/lib/studioLightPresence";
import { LIGHT_STATES } from "@/vendor/felencho-light/src/light/controller";
import { connectStudioLightAudioMonitor } from "@/lib/studioLightAudioMonitor";

// The exact approved assets are copied by the isolated installer into /public/studio-light/assets.
// Do not regenerate, relink to Lovable CDN or import the photos as Next Image objects.
const configs: Record<LightCharacter, PresenceConfig> = {
  bob: {
    character: "bob", name: "Bob", voiceName: "Dylan",
    portrait: "/studio-light/assets/bob-v1-portrait.jpg",
    closed: "/studio-light/assets/bob-v1-portrait.jpg",
    palette: { cyan: [0.15, 0.55, 1], violet: [1, 0.7, 0.23], gold: [0.9, 0.63, 0.25] },
    core: [0, -0.55, 0.45], coreUV: [0.51, 0.42],
  },
  lina: {
    character: "lina", name: "Lina", voiceName: "Serena",
    portrait: "/studio-light/assets/lina-v2-portrait.jpg",
    closed: "/studio-light/assets/lina-v2-sleep.webp",
    palette: { cyan: [0.2, 0.8, 1], violet: [0.65, 0.2, 0.9], gold: [0.9, 0.63, 0.25] },
    core: [0.35, -1.02, 0.45], coreUV: [0.585, 0.352],
  },
};

// Scene is the original shader/geometry implementation from Lovable, kept unchanged.
// Loading is client only, because WebGL, window, Audio and HTMLCanvasElement need a browser.
const LightScene = dynamic(
  () => import("@/vendor/felencho-light/src/presence/Scene").then((m) => m.Scene),
  { ssr: false },
);

export default function StudioLightClient({ character, dev = false }: { character: LightCharacter; dev?: boolean }) {
  const [api] = useState(createV3Controller);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [connection, setConnection] = useState("Conectando puente...");
  const [fileName, setFileName] = useState("");
  const [labError, setLabError] = useState("");
  const [displayState, setDisplayState] = useState("IDLE");
  const [rms, setRms] = useState(0);
  const [visiblePanel, setVisiblePanel] = useState(dev);
  const inputRef = useRef<HTMLInputElement>(null);
  const stopMonitorRef = useRef<(() => void) | null>(null);
  const monitorConnectingRef = useRef(false);
  const [monitorStatus, setMonitorStatus] = useState("LiveKit sin conectar (prueba opcional)");
  const config = configs[character];

  useEffect(() => {
    const instance = createAudioPlayer(api, config.name);
    api.speech.setMode("energy"); // No experimental mouth deformation.
    setPlayer(instance);
    const detach = connectLocalWakeEvents(character, {
      setState: (state) => { api.rig.stopDemo(); api.setState(state); },
      pushAudio: (bands) => api.pushAudio(bands),
    }, setConnection);
    return () => { detach(); instance.dispose(); setPlayer(null); };
  }, [character, api, config.name]);

  // Only refresh a readout in the operator's diagnostic panel.
  useEffect(() => {
    if (!visiblePanel || !player) return;
    const interval = window.setInterval(() => {
      setDisplayState(api.getSnapshot().state);
      setRms(player.getSnapshot().rms);
      setLabError(player.getSnapshot().error);
    }, 180);
    return () => window.clearInterval(interval);
  }, [api, player, visiblePanel]);

  useEffect(() => () => { stopMonitorRef.current?.(); stopMonitorRef.current = null; }, []);

  const connectSilentAudio = async () => {
    if (monitorConnectingRef.current || stopMonitorRef.current) return;
    if (window.location.hostname !== "127.0.0.1" || window.location.port !== "3118") {
      setMonitorStatus("Disponible solamente en 127.0.0.1:3118");
      return;
    }
    monitorConnectingRef.current = true;
    try {
      const stop = await connectStudioLightAudioMonitor(character, {
        setState: (state) => api.setState(state),
        pushAudio: (bands) => api.pushAudio(bands),
      }, setMonitorStatus);
      stopMonitorRef.current = stop;
    } catch (e) {
      setMonitorStatus("No conectado: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      monitorConnectingRef.current = false;
    }
  };

  const disconnectSilentAudio = () => {
    stopMonitorRef.current?.();
    stopMonitorRef.current = null;
    setMonitorStatus("Receptor de audio desconectado");
  };

  const filePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !player) return;
    player.load(file);
    setFileName(file.name);
    setLabError("");
    event.target.value = "";
  };

  return <main className="light-root">
    <div className="light-portrait">
      {player && <Suspense fallback={null}>
        <LightScene api={api} player={player} config={config} ready={() => {}} />
      </Suspense>}
    </div>
    {visiblePanel && player && <aside className="light-panel">
      <strong>{config.name} · LAB local</strong>
      <p className="hint">Original Lovable 2.5D · labios estáticos · pantalla de producción sin audio propio</p>
      <p>Puente: {connection}</p><p>Estado: {displayState}</p>
      <button onClick={() => inputRef.current?.click()}>Cargar WAV/MP3 {config.voiceName}</button>
      <input ref={inputRef} type="file" accept=".wav,.mp3,.ogg,.m4a,audio/*" onChange={filePicked} style={{ display: "none" }} />
      <p className="hint">{fileName || "Sin archivo local"}</p>
      <div className="light-row">
        <button onClick={() => void player.resume()}>Reproducir</button>
        <button onClick={() => player.pause()}>Pausar</button>
        <button onClick={() => player.stop()}>Detener</button>
      </div>
      <p>RMS del reproductor de archivo: {rms.toFixed(4)}</p>
      <p>LiveKit: {monitorStatus}</p>
      <div className="light-row">
        <button onClick={() => void connectSilentAudio()}>Conectar analizador LiveKit (silencioso)</button>
        <button onClick={disconnectSilentAudio}>Desconectar analizador</button>
      </div>
      <button onClick={() => {player.stop(); api.rig.startDemo();}}>Demo luz 12 s (sin sonido)</button>
      <p className="hint">Audio de laboratorio solamente. No conectar audio del navegador al RØDECaster mientras suene la voz por LiveKit.</p>
      <div className="light-states">
        {LIGHT_STATES.map(state => <button key={state} onClick={() => {player.stop(); api.setState(state);}}>{state}</button>)}
      </div>
      {labError && <p role="alert">{labError}</p>}
      <button onClick={() => setVisiblePanel(false)}>Vista limpia</button>
    </aside>}
    <style jsx>{`
      .light-root { position: fixed; inset: 0; width: 100vw; height: 100dvh; background: #000; display: flex; justify-content: center; align-items: center; overflow: hidden; }
      .light-portrait { height: min(100dvh, 177.778vw); width: min(56.25dvh, 100vw); background: #000; flex: none; }
      .light-panel { position: fixed; right: 8px; top: 8px; bottom: 8px; overflow: auto; z-index: 10; width: min(320px, 90vw); padding: 14px; box-sizing: border-box; border: 1px solid #335068; border-radius: 12px; background: #09121deb; color: #e3f2ff; font: 13px/1.4 system-ui; }
      .light-panel p { margin: 8px 0; } .hint { color: #adc4da; }
      .light-panel button { background: #142e44; border: 1px solid #46728d; border-radius: 5px; padding: 8px; color: white; margin: 3px; cursor: pointer; }
      .light-row { display: flex; flex-wrap: wrap; }
      .light-states { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px; margin: 8px 0; }
    `}</style>
  </main>;
}
