import HologramPresence from "@/components/presence/HologramPresence";

// Isolated visual preview: no live provider, no TTS, no microphone.
export default function BobHologramPage() {
  return <HologramPresence character="bob" />;
}
