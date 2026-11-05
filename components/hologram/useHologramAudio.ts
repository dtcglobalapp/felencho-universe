"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentTimedViseme, neutralMouth, spectralMouth,
  type MouthState, type TimedViseme,
} from "@/lib/hologram/visemes";

export type AudioFrame = MouthState & { bass: number; mid: number; treble: number };
export const SILENT_FRAME: AudioFrame = { ...neutralMouth, bass: 0, mid: 0, treble: 0 };

export function useHologramAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const spectrumRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024));
  const waveformRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024));
  const timelineRef = useRef<TimedViseme[]>([]);
  const srcRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = new Audio();
    element.preload = "auto";
    element.crossOrigin = "anonymous";
    element.onended = () => setPlaying(false);
    element.onerror = () => setError("No se pudo reproducir este archivo de audio.");
    audioRef.current = element;
    setAudio(element);
    return () => {
      element.pause();
      element.removeAttribute("src");
      element.load();
      if (srcRef.current) URL.revokeObjectURL(srcRef.current);
      void contextRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  const ensureAudio = useCallback(async () => {
    const element = audioRef.current;
    if (!element) throw new Error("El reproductor aún no está listo.");
    if (!contextRef.current) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      const source = context.createMediaElementSource(element);
      source.connect(analyser);
      analyser.connect(context.destination);
      contextRef.current = context;
      sourceRef.current = source;
      analyserRef.current = analyser;
    }
    await contextRef.current.resume();
    return element;
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) {
      setError("Selecciona un archivo de audio.");
      return;
    }
    audioRef.current?.pause();
    if (srcRef.current) URL.revokeObjectURL(srcRef.current);
    const url = URL.createObjectURL(file);
    srcRef.current = url;
    if (audioRef.current) audioRef.current.src = url;
    setFileName(file.name);
    setPlaying(false);
    setError("");
    timelineRef.current = [];
  }, []);

  const loadVisemes = useCallback(async (file: File) => {
    try {
      const values: unknown = JSON.parse(await file.text());
      if (!Array.isArray(values) || values.length > 20000) throw new Error();
      const allowed = ["REST", "A", "E", "I", "O", "U", "M", "F", "L", "S"];
      const rows = values.map((value: unknown) => {
        if (!value || typeof value !== "object") throw new Error();
        const row = value as { time?: unknown; viseme?: unknown; weight?: unknown };
        if (typeof row.time !== "number" || !Number.isFinite(row.time)
          || row.time < 0 || !allowed.includes(String(row.viseme))) throw new Error();
        return { time: row.time, viseme: row.viseme as TimedViseme["viseme"],
          weight: typeof row.weight === "number" ? Math.max(0, Math.min(1, row.weight)) : 1 };
      });
      timelineRef.current = rows.sort((a, b) => a.time - b.time);
      setError("");
    } catch {
      setError("JSON de visemas inválido. Usa [{time:0,viseme:\"A\"}, ...].");
    }
  }, []);

  const togglePlayback = useCallback(async () => {
    try {
      const element = await ensureAudio();
      if (!element.src) { setError("Carga primero un WAV o MP3."); return; }
      if (!element.paused) { element.pause(); setPlaying(false); }
      else { await element.play(); setPlaying(true); setError(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo activar el audio."); }
  }, [ensureAudio]);

  const sample = useCallback((): AudioFrame => {
    const analyser = analyserRef.current;
    const element = audioRef.current;
    if (!analyser || !element || element.paused || element.ended) return SILENT_FRAME;
    const bins = spectrumRef.current;
    const waves = waveformRef.current;
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(waves);
    let squared = 0;
    for (const value of waves) {
      const sample = (value - 128) / 128;
      squared += sample * sample;
    }
    const level = Math.min(1, Math.sqrt(squared / waves.length) * 3.3);
    const mean = (start: number, end: number) => {
      let sum = 0;
      const a = Math.floor(bins.length * start);
      const b = Math.max(a + 1, Math.floor(bins.length * end));
      for (let i = a; i < b; i++) sum += bins[i];
      return sum / ((b - a) * 255);
    };
    const timed = currentTimedViseme(timelineRef.current, element.currentTime);
    const mouth = timed
      ? { viseme: timed.viseme, weight: Math.min(1, (timed.weight ?? 1) * Math.max(level, 0.25)), level }
      : spectralMouth(bins, level, element.currentTime);
    return { ...mouth, bass: mean(0, 0.09), mid: mean(0.09, 0.35), treble: mean(0.35, 0.85) };
  }, []);

  return { audio, playing, error, fileName, loadFile, loadVisemes, togglePlayback, sample };
}
