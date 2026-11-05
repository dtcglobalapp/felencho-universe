"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from "livekit-client";

type Actor = "bob" | "lina";
type StageMode = "escuchando" | "hablando" | "suspendido";
const DB_NAME = "felencho-hologram-studio-local-v1";
const STORE = "portraits";

function openPortraitDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadPortrait(character: Actor): Promise<Blob | undefined> {
  const db = await openPortraitDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(character);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function storePortrait(character: Actor, blob: Blob): Promise<void> {
  const db = await openPortraitDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, character);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export default function HologramPortraitClient({ character, controlMode = false }: { character: Actor; controlMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const portraitUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const liveAnalyzerRef = useRef<AnalyserNode | null>(null);
  const liveContextRef = useRef<AudioContext | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [liveStatus, setLiveStatus] = useState("Estudio sin conectar");
  const [liveConnecting, setLiveConnecting] = useState(false);
  const rafRef = useRef<number>(0);
  const modeRef = useRef<StageMode>("escuchando");
  const [mode, setMode] = useState<StageMode>("escuchando");
  const [hasPortrait, setHasPortrait] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [showControls, setShowControls] = useState(controlMode);
  const [notice, setNotice] = useState("Selecciona una imagen de referencia del personaje");
  const [audioName, setAudioName] = useState("");
  // LIVE audio is a separate authenticated studio session; never autostart
  // an old avatar agent or request a public microphone.
  async function connectStudio() {
    if (roomRef.current || liveConnecting) return;
    setLiveConnecting(true);
    try {
      // Create and resume while this click still has browser user activation.
      // A later ontrack callback may not be allowed to resume an AudioContext.
      const liveCtx = new AudioContext();
      liveContextRef.current = liveCtx;
      await liveCtx.resume();
      const response = await fetch("/api/hologram-stage/live-token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ character, role: "screen" }),
      });
      const auth: { serverUrl?: string; participantToken?: string; error?: string } = await response.json();
      if (!response.ok || !auth.serverUrl || !auth.participantToken)
        throw new Error(auth.error || "No hay sesión de estudio");
      const room = new Room();
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication, participant: RemoteParticipant) => {
        if (track.kind !== Track.Kind.Audio || !participant.identity.startsWith("hologram-director-" + character + "-")) return;
        const media = track.mediaStreamTrack;
        const ctx = liveContextRef.current;
        if (!ctx) return;
        const src = ctx.createMediaStreamSource(new MediaStream([media]));
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 1024;
        analyzer.smoothingTimeConstant = .72;
        src.connect(analyzer);
        // Intentionally do NOT attach speaker output: the RØDECaster is the
        // monitor source; TVs use audio only to illuminate the character.
        liveAnalyzerRef.current = analyzer;
        setStageMode("hablando");
        setLiveStatus("Audio de " + character.toUpperCase() + " recibido del estudio");
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        liveAnalyzerRef.current = null;
        if (liveContextRef.current) void liveContextRef.current.close();
        liveContextRef.current = null;
        setStageMode("escuchando");
        setLiveStatus("Estudio conectado: escuchando");
      });
      room.on(RoomEvent.Disconnected, () => {
        liveAnalyzerRef.current = null;
        if (liveContextRef.current) void liveContextRef.current.close();
        liveContextRef.current = null;
        roomRef.current = null;
        setStageMode("escuchando");
        setLiveStatus("Estudio desconectado");
      });
      await room.connect(auth.serverUrl, auth.participantToken);
      roomRef.current = room;
      setLiveStatus("Estudio conectado: esperando voz de " + character.toUpperCase());
    } catch (error) {
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (liveContextRef.current) void liveContextRef.current.close();
      liveContextRef.current = null;
      setLiveStatus(error instanceof Error ? error.message : "No se pudo conectar");
    } finally { setLiveConnecting(false); }
  }
  function disconnectStudio() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    liveAnalyzerRef.current = null;
    if (liveContextRef.current) void liveContextRef.current.close();
    liveContextRef.current = null;
    setStageMode("escuchando");
    setLiveStatus("Estudio desconectado");
  }
  const isBob = character === "bob";
  const accent = isBob ? [64, 178, 255] : [154, 96, 255];
  const secondary = isBob ? [255, 179, 70] : [48, 232, 255];

  function setStageMode(next: StageMode) {
    modeRef.current = next;
    setMode(next);
  }
  function stop() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setStageMode("escuchando");
  }
  async function onPortrait(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12_000_000) {
      setNotice("Elige una imagen JPG, PNG o WebP de hasta 12 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
      portraitUrlRef.current = url;
      imageRef.current = image;
      setHasPortrait(true);
      setNotice("Imagen cargada. Se conservará solo en este navegador.");
      try { await storePortrait(character, file); }
      catch { setNotice("Imagen visible, pero este navegador no permitió guardarla."); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); setNotice("No se pudo abrir la imagen."); };
    image.src = url;
  }
  function onAudio(file: File | undefined) {
    stop();
    if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    if (!file || !file.type.startsWith("audio/")) {
      audioObjectUrlRef.current = null;
      setHasAudio(false);
      return;
    }
    const url = URL.createObjectURL(file);
    audioObjectUrlRef.current = url;
    const audio = audioRef.current;
    if (audio) audio.src = url;
    setAudioName(file.name);
    setHasAudio(true);
  }
  async function play() {
    if (!audioRef.current || !hasAudio) return;
    try {
      if (!audioContextRef.current) {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audioRef.current);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        analyserRef.current = analyser;
      }
      await audioContextRef.current.resume();
      await audioRef.current.play();
      setStageMode("hablando");
      setNotice("Audio activo: las luces responden a esta voz.");
    } catch {
      setStageMode("escuchando");
      setNotice("El navegador no permitió iniciar el audio.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Fallback packaged in the existing site: every television opens with a
    // visible actor rather than a blank page. A locally approved portrait
    // overrides this fallback whenever one has already been chosen.
    const fallback = new Image();
    fallback.onload = () => {
      if (cancelled || imageRef.current) return;
      imageRef.current = fallback;
      setHasPortrait(true);
      setNotice("Retrato provisional integrado. Puedes sustituirlo por el holograma aprobado.");
    };
    fallback.onerror = () => {
      if (!cancelled) setNotice("No se encontró el retrato integrado: selecciona una imagen.");
    };
    fallback.src = character === "bob"
      ? "/avatars/bob/bob-2x3.png"
      : "/avatars/lina/lina-2x3.jpg";
    loadPortrait(character).then((blob) => {
      if (cancelled || !blob) return;
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (cancelled) { URL.revokeObjectURL(url); return; }
        portraitUrlRef.current = url;
        imageRef.current = img;
        setHasPortrait(true);
        setNotice("Retrato holográfico restaurado desde este navegador.");
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const w = 720, h = 1280;
    canvas.width = w;
    canvas.height = h;
    const color = (rgb: number[], a: number) => "rgba(" + rgb.join(",") + "," + a + ")";
    const values = new Uint8Array(512);
    let energySmooth = 0;
    let last = 0;
    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate);
      if (now - last < 24) return; // ~40 fps on the studio TVs
      last = now;
      const analyser = liveAnalyzerRef.current || analyserRef.current;
      let rms = 0, bass = 0;
      if (analyser && modeRef.current === "hablando") {
        analyser.getByteFrequencyData(values);
        for (let i = 3; i < 85; i++) rms += values[i];
        for (let i = 3; i < 18; i++) bass += values[i];
        rms /= 82 * 185;
        bass /= 15 * 210;
      }
      energySmooth += (Math.min(1, rms) - energySmooth) * 0.21;
      const energy = modeRef.current === "suspendido" ? 0 : energySmooth;
      const live = modeRef.current !== "suspendido";
      const sway = Math.sin(now * 0.0005 + (isBob ? 0 : 1.9));
      ctx.fillStyle = "#020816";
      ctx.fillRect(0, 0, w, h);

      const picture = imageRef.current;
      if (picture && picture.complete && picture.naturalWidth) {
        // Subtle 2.5D parallax, not a false claim of a real 3D mesh.
        const scale = 1.035 + energy * 0.014;
        const ratio = Math.max(w / picture.naturalWidth, h / picture.naturalHeight) * scale;
        const dw = picture.naturalWidth * ratio, dh = picture.naturalHeight * ratio;
        const px = (w - dw) / 2 + sway * 3, py = (h - dh) / 2 + Math.sin(now * .00036) * 4;
        ctx.globalAlpha = live ? 1 : .39;
        ctx.drawImage(picture, px, py, dw, dh);
        ctx.globalAlpha = 1;
      } else {
        const g = ctx.createRadialGradient(w/2,h*.43,5,w/2,h*.45,h*.65);
        g.addColorStop(0,color(accent,.13));
        g.addColorStop(1,"#020816");
        ctx.fillStyle = g;
        ctx.fillRect(0,0,w,h);
        ctx.font = "500 28px system-ui";
        ctx.fillStyle = "#b3c7dd"; ctx.textAlign = "center";
        ctx.fillText("Cargar retrato de " + character.toUpperCase(), w / 2, h / 2);
      }

      // Audio-driven luminous projection, aligned with face and upper torso.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const cx = w * .5, cy = h * .37;
      for (let j = 0; j < 4; j++) {
        const radius = 128 + j * 39 + (bass * 56);
        ctx.beginPath();
        ctx.ellipse(cx,cy,radius, radius*.95,now*.00009*(j%2?1:-1),0,Math.PI*2);
        ctx.strokeStyle = color(j%2?secondary:accent,(live?.055:.015)+energy*.34);
        ctx.lineWidth = 1.5 + energy*4;
        ctx.shadowColor = color(secondary, .95);
        ctx.shadowBlur = 9 + energy*38;
        ctx.stroke();
      }
      const chestY = h * .59;
      const gradient = ctx.createRadialGradient(cx,chestY,0,cx,chestY,150+energy*80);
      gradient.addColorStop(0,color(secondary,.08+energy*.58));
      gradient.addColorStop(.38,color(accent,.05+energy*.25));
      gradient.addColorStop(1,color(accent,0));
      ctx.fillStyle = gradient;
      ctx.beginPath();ctx.arc(cx,chestY,150+energy*80,0,Math.PI*2);ctx.fill();
      for (let i=0;i<110;i++) {
        const n=i*2.399963,phase=now*.00008*(i%4+1)+n;
        const x=w/2+Math.sin(phase)*w*.34;
        const y=(h*.19+((i*41+now*.022)%(h*.62)));
        ctx.fillStyle=color(i%4?accent:secondary,(live?.13:.02)+energy*.35);
        ctx.beginPath();ctx.arc(x,y,1.2+energy*2.6,0,Math.PI*2);ctx.fill();
      }
      const barWidth=6, gap=5, count=48, start=(w-(barWidth+gap)*count)/2;
      for(let i=0;i<count;i++){
        const shape=Math.sin(Math.PI*(i+.5)/count);
        const sample=analyser ? values[Math.min(511,3+i*2)] / 255 : 0;
        const bh=4+ (modeRef.current==="hablando" ? sample*(95+energy*80)*shape : 0);
        ctx.fillStyle=color(i%6?accent:secondary,.45+energy*.5);
        ctx.fillRect(start+i*(barWidth+gap),h*.90-bh,barWidth,bh);
      }
      ctx.restore();
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [character]);

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    const onEnded = () => setStageMode("escuchando");
    a.addEventListener("ended", onEnded);
    return () => {
      a.pause();
      a.removeEventListener("ended", onEnded);
      audioRef.current = null;
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
      if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
      if (audioContextRef.current) void audioContextRef.current.close();
      roomRef.current?.disconnect();
      if (liveContextRef.current) void liveContextRef.current.close();
      audioContextRef.current = null;
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#020816] text-white">
      <canvas ref={canvasRef} className="h-full w-full object-contain" aria-label={character + " holograma audio reactivo"} />
      <div className="pointer-events-none absolute left-5 top-5 text-sm font-semibold tracking-[.28em] text-cyan-100/70">
        {character.toUpperCase()}
      </div>
      {controlMode && (
        <button className="absolute right-4 top-4 rounded bg-slate-900/80 px-3 py-2 text-xs text-cyan-100"
          onClick={() => setShowControls(v => !v)} aria-label="Mostrar u ocultar controles privados">
          {showControls ? "Ocultar control" : "Configurar"}
        </button>
      )}
      {controlMode && showControls && (
        <section className="absolute bottom-4 left-1/2 z-10 w-[min(94vw,650px)] -translate-x-1/2 space-y-3 rounded-xl border border-cyan-500/35 bg-[#071328]/95 p-4 text-sm shadow-2xl">
          <div className="font-semibold">{character.toUpperCase()} · Pantalla de laboratorio independiente</div>
          <p className="text-xs text-slate-300">
            Imagen y audio se cargan en este navegador. El retrato permanece guardado localmente; no se sube a un servidor.
            Esta es una proyección 2.5D reactiva, todavía no un modelo 3D GLB.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">Retrato {hasPortrait ? "✓" : ""}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void onPortrait(e.target.files?.[0])} />
            </label>
            <label className="flex flex-col gap-1">Audio {hasAudio ? "✓" : ""}
              <input type="file" accept="audio/*" onChange={e => onAudio(e.target.files?.[0])}/>
            </label>
          </div>
          <div className="rounded border border-cyan-700/70 p-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded bg-sky-700 px-3 py-2 disabled:opacity-50" disabled={liveConnecting || !!roomRef.current}
                onClick={()=>void connectStudio()}>Conectar al estudio</button>
              <button className="rounded bg-slate-700 px-3 py-2" onClick={disconnectStudio}>Desconectar</button>
              <span aria-live="polite">{liveStatus}</span>
            </div>
            <p className="mt-1 text-slate-400">Solo analiza audio recibido del estudio, sin reproducirlo en la TV. Acceso privado requerido.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-cyan-700 px-3 py-2 disabled:opacity-40" disabled={!hasAudio} onClick={()=>void play()}>Reproducir voz</button>
            <button className="rounded bg-amber-700 px-3 py-2" onClick={stop}>Interrumpir</button>
            <button className="rounded bg-slate-700 px-3 py-2" onClick={()=>{stop();setStageMode("suspendido");}}>Suspender</button>
            <button className="rounded bg-slate-700 px-3 py-2" onClick={()=>setStageMode("escuchando")}>Escuchar</button>
          </div>
          <div className="text-xs text-slate-300" aria-live="polite">{notice} {audioName ? "· " + audioName : ""} · {mode}</div>
        </section>
      )}
    </main>
  );
}
