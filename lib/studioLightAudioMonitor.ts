/**
 * Optional audio-only meter for the isolated Felencho Light browser lab.
 * Never attaches an audio element or sends sound to the studio/TV output.
 * Rendering stays in the original Lovable Scene; no face/lip modifications.
 */
import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrack } from "livekit-client";
import type { LightBands, LightCharacter, PresenceRenderer } from "./studioLightPresence";

export async function connectStudioLightAudioMonitor(
  character: LightCharacter,
  renderer: PresenceRenderer,
  status: (message: string) => void,
): Promise<() => void> {
  // This call is made directly from an operator click, before any awaits,
  // allowing browsers to unlock a read-only AudioContext.
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  const muted = context.createGain();
  muted.gain.value = 0;
  analyser.connect(muted);
  muted.connect(context.destination);
  const room = new Room();
  const bins = new Uint8Array(analyser.frequencyBinCount);
  let active = true;
  let source: MediaStreamAudioSourceNode | null = null;
  let currentSid: string | null = null;
  let frame = 0;
  let lastReport = 0;
  const expected = character === "bob" ? "bob-" : "serena-";
  const silence: LightBands = { level: 0, bass: 0, mids: 0, treble: 0 };
  const report = (message: string) => { if (active) status(message); };
  const detach = () => {
    if (source) { source.disconnect(); source = null; }
    currentSid = null;
    renderer.pushAudio(silence);
  };
  const stop = () => {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    detach();
    void room.disconnect();
    void context.close().catch(() => {});
  };
  const band = (low: number, high: number) => {
    const hzPerBin = context.sampleRate / analyser.fftSize;
    const first = Math.max(0, Math.min(bins.length - 1, Math.floor(low / hzPerBin)));
    const end = Math.max(first + 1, Math.min(bins.length, Math.ceil(high / hzPerBin)));
    let sum = 0;
    for (let i = first; i < end; i++) sum += bins[i];
    return Math.min(1, sum / (end - first) / 180);
  };
  const tick = (now: number) => {
    if (!active) return;
    if (source) {
      analyser.getByteFrequencyData(bins);
      const bass = band(80, 300), mids = band(300, 2400), treble = band(2400, 7500);
      const level = Math.min(1, 0.2 * bass + 0.55 * mids + 0.25 * treble);
      renderer.pushAudio({ level, bass, mids, treble });
      if (now - lastReport > 900) {
        report("Pista "+character+" recibida; nivel "+level.toFixed(2)+"; AudioContext "+context.state+"; salida silenciada");
        lastReport = now;
      }
    }
    frame = requestAnimationFrame(tick);
  };
  const attach = (track: RemoteTrack, publication: { trackName?: string; name?: string }, participant: RemoteParticipant) => {
    const trackName = publication.trackName ?? publication.name ?? "";
    if (!active || track.kind !== Track.Kind.Audio ||
        !participant.identity.startsWith("a-") || !trackName.startsWith(expected)) return;
    detach();
    const media = track.mediaStreamTrack;
    source = context.createMediaStreamSource(new MediaStream([media]));
    source.connect(analyser);
    currentSid = track.sid ?? null;
    report("Pista "+trackName+" enlazada; audio solo para energía luminosa");
  };
  room.on(RoomEvent.TrackSubscribed, attach);
  room.on(RoomEvent.TrackUnsubscribed, track => {
    if (track.sid !== currentSid || !currentSid) return;
    detach();
    report("Pista terminada; esperando próxima voz "+character);
  });
  room.on(RoomEvent.Disconnected, () => report("Sala LiveKit desconectada"));
  try {
    void context.resume().catch(() => report("AudioContext suspendido; vuelve a conectar desde el panel"));
    report("Solicitando receptor LiveKit local...");
    const response = await fetch("/api/studio-light/local-audio-token", {
      cache: "no-store", signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) throw new Error("Token local HTTP "+response.status);
    const credentials = await response.json() as { server?: string; token?: string };
    if (credentials.server !== "ws://127.0.0.1:7880" || !credentials.token) {
      throw new Error("Respuesta de sala inesperada");
    }
    await room.connect(credentials.server, credentials.token);
    report("Receptor silencioso conectado; esperando pista "+expected);
    frame = requestAnimationFrame(tick);
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
