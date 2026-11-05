"use client";

import { useEffect, useRef, useState } from "react";

type Props = { character: string; onActivity: (value: number) => void };

const DEMO = {
  bob: "Buenas noches. Soy Bob, desde Felencho Mundial. Estamos preparando nuestro nuevo estudio holográfico.",
  lina: "Hola, Felencho. Soy Lina. Estamos probando mi voz y la animación de mi rostro para Felencho Mundial.",
};

export default function HologramVoiceDemo({ character, onActivity }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState("Prueba local, sin servicios de pago");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speakingRef = useRef(false);
  const activityTimer = useRef<number | null>(null);
  const characterId = character.toLowerCase() === "lina" ? "lina" : "bob";

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setMessage("Este navegador no admite síntesis de voz.");
      return;
    }
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      window.speechSynthesis.cancel();
      if (activityTimer.current !== null) window.clearInterval(activityTimer.current);
      onActivity(0);
    };
  }, [onActivity]);

  function stop() {
    speakingRef.current = false;
    window.speechSynthesis.cancel();
    if (activityTimer.current !== null) window.clearInterval(activityTimer.current);
    activityTimer.current = null;
    onActivity(0);
    setSpeaking(false);
  }

  function play() {
    if (!("speechSynthesis" in window)) return;
    stop();
    const utterance = new SpeechSynthesisUtterance(DEMO[characterId]);
    utterance.lang = "es-ES";
    utterance.rate = characterId === "bob" ? 0.89 : 1.02;
    utterance.pitch = characterId === "bob" ? 0.75 : 1.12;
    const spanish = voices.filter(v => v.lang.toLowerCase().startsWith("es"));
    utterance.voice = spanish.find(v => characterId === "lina" ? /female|mujer|monica|paulina|paloma|sofia/i.test(v.name) : /male|hombre|jorge|diego|carlos/i.test(v.name)) ?? spanish[0] ?? null;
    utterance.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
      setMessage("Voz local del navegador · sincronización aproximada");
      activityTimer.current = window.setInterval(() => {
        // Browser SpeechSynthesis does not expose its audio waveform.
        // This is expressive motion only, NOT waveform-driven lip sync.
        if (speakingRef.current) onActivity(0.22 + Math.random() * 0.72);
      }, 115);
    };
    utterance.onend = () => { stop(); setMessage("Prueba terminada"); };
    utterance.onerror = () => { stop(); setMessage("No se pudo reproducir la voz local"); };
    window.speechSynthesis.speak(utterance);
  }

  return (
    <aside style={{ position: "absolute", right: 16, top: 50, zIndex: 10, display: "grid", gap: 6, justifyItems: "end" }}>
      <button onClick={speaking ? stop : play} type="button" style={{ border: "1px solid rgba(121,235,249,.6)", background: "rgba(5,15,28,.92)", borderRadius: 10, padding: "11px 15px", color: "#e5fcff", fontSize: 13, cursor: "pointer" }}>
        {speaking ? "■ Detener voz" : "▶ Probar voz"}
      </button>
      <small style={{ maxWidth: 225, textAlign: "right", color: "#a5b7c7", fontSize: 10 }}>{message}</small>
    </aside>
  );
}
