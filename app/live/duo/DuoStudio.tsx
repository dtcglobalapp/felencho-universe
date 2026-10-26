"use client";
import { useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

type Person = "bob" | "lina";
export default function DuoStudio() {
  const roomRef = useRef<Room | null>(null);
  const videoRefs = useRef<Record<Person, HTMLDivElement | null>>({ bob: null, lina: null });
  const audioRef = useRef<HTMLDivElement | null>(null);
  const videoOwners = useRef<Map<string, Person>>(new Map());
  const pendingCharacter = useRef<Person>("bob");
  const [status, setStatus] = useState("Listo para iniciar");
  const [active, setActive] = useState(false);
  const [mic, setMic] = useState(false);
  const [seen, setSeen] = useState<Record<Person, boolean>>({bob:false,lina:false});
  async function start() {
    if (roomRef.current) return;
    setStatus("Creando una sala para Bob y Lina...");
    try {
      const response = await fetch("/api/live/session", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({character:"bob",mode:"duo"})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear la sala");
      const room = new Room({adaptiveStream:true,dynacast:true});
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Video) {
          const identity = participant.identity;
          // Sequential dispatch pins each video identity to its intended character.
          const target = videoOwners.current.get(identity) || pendingCharacter.current;
          videoOwners.current.set(identity, target);
          const container = videoRefs.current[target];
          if (container) {
            const element = track.attach() as HTMLVideoElement;
            element.autoplay = true; element.playsInline = true; element.style.width="100%";element.style.height="100%";element.style.objectFit="contain";
            container.replaceChildren(element);
            setSeen(prev=>({...prev,[target]:true}));
          }
        } else if (track.kind === Track.Kind.Audio && audioRef.current) {
          const element = track.attach() as HTMLAudioElement;
          element.autoplay = true;
          audioRef.current.appendChild(element);
          void element.play().catch(()=>{});
        }
      });
      room.on(RoomEvent.Disconnected, ()=>{roomRef.current=null;setActive(false);setMic(false);setStatus("Sala desconectada");});
      await room.connect(data.serverUrl,data.participantToken);
      setActive(true);
      for (const character of ["bob","lina"] as const) {
        pendingCharacter.current = character;
        setStatus("Conectando a "+character+"...");
        const res = await fetch("/api/live/dispatch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:data.roomName,participantIdentity:room.localParticipant.identity,character,mode:"duo"})});
        if (!res.ok) {const err=await res.json().catch(()=>({}));throw new Error(err.error || "Falló "+character);}
        // Wait for Bob's video before dispatching Lina; avoid identity ambiguity.
        await new Promise<void>((resolve, reject) => {
          const started = Date.now();
          const check = () => {
            if (videoRefs.current[character]?.querySelector("video")) return resolve();
            if (Date.now() - started > 90000) return reject(new Error("El video de "+character+" no llegó en 90 segundos."));
            window.setTimeout(check, 500);
          };
          check();
        });
      }
      setStatus("Bob y Lina están entrando. Llámalos por su nombre para darles la palabra.");
    } catch(e) {setStatus(e instanceof Error?e.message:"Error al conectar");await roomRef.current?.disconnect();roomRef.current=null;setActive(false);}
  }
  async function microphone() {
    if (!roomRef.current) return;
    try {await roomRef.current.localParticipant.setMicrophoneEnabled(true,undefined,{dtx:false});setMic(true);setStatus("Micrófono activo. Di «Bob» o «Lina» al comenzar cada pregunta.");}
    catch(e){setStatus(e instanceof Error?e.message:"No se pudo activar el micrófono");}
  }
  async function stop() {await roomRef.current?.disconnect();roomRef.current=null;setActive(false);setMic(false);setSeen({bob:false,lina:false});videoOwners.current.clear();for(const key of ["bob","lina"] as const)videoRefs.current[key]?.replaceChildren();audioRef.current?.replaceChildren();setStatus("Sesión cerrada");}
  return <main className="min-h-screen bg-black text-white p-5"><header className="text-center mb-5"><p className="text-cyan-300 tracking-widest text-xs">FELENCHO MUNDIAL · MESA REDONDA</p><h1 className="text-3xl font-bold mt-2">Bob + Lina + Felencho</h1></header><div className="grid grid-cols-2 gap-3 max-w-5xl mx-auto">{(["bob","lina"] as const).map(person=><section key={person} className="min-w-0"><h2 className="text-center text-2xl font-semibold mb-2 capitalize">{person}</h2><div ref={node=>{videoRefs.current[person]=node}} className="aspect-[2/3] rounded-2xl border border-white/20 bg-zinc-950 overflow-hidden flex items-center justify-center">{!seen[person]&&<span className="text-zinc-500">Esperando video...</span>}</div></section>)}</div><div ref={audioRef} className="hidden"/><p className="text-center text-sm text-cyan-200 mt-5">{status}</p><div className="flex flex-wrap justify-center gap-3 mt-4">{!active?<button onClick={start} className="rounded-full bg-white text-black font-bold px-6 py-3">Iniciar mesa redonda</button>:<><button onClick={microphone} disabled={mic} className="rounded-full bg-emerald-300 disabled:opacity-50 text-black font-bold px-6 py-3">{mic?"Micrófono activo":"Activar micrófono"}</button><button onClick={stop} className="rounded-full border border-white/40 px-6 py-3">Cerrar sesión</button></>}</div><p className="text-center text-zinc-400 text-xs mt-4">Para evitar interrupciones, dirige cada pregunta a Bob o Lina por su nombre. Usa audífonos.</p></main>;
}
