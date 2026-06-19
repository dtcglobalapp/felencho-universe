"use client";

import { useEffect, useState } from "react";

const characters = [
  {
    name: "Bob",
    id: "37e736a2-38ef-4de3-8ae9-2df61c2281d2",
    defaultUser: "Felencho",
    defaultMessage: "Hola Bob, preséntate como parte de Lumina Studio.",
  },
  {
    name: "Lina",
    id: "adec8041-03d0-41c9-a8ec-8e9f7ab68010",
    defaultUser: "Felencho",
    defaultMessage: "Hola Lina. Preséntate para los oyentes de Felencho Mundial.",
  },
  {
    name: "Felencho Virtual",
    id: "7da1296c-41ca-4729-b893-6a4f9a7b645b",
    defaultUser: "Miriam Garcia",
    defaultMessage: "Miriam acaba de entrar al estudio. Salúdala.",
  },
];

const nameCorrections: Array<[RegExp, string]> = [
  [/\b(fencho|femenino|felencio|felenzo|felenxo|felenchoo|ferencho|felencho)\b/gi, "Felencho"],
  [/\b(mirian|miriam garcía|miriam garcia|miriam)\b/gi, "Miriam Garcia"],
  [/\b(jesica|yesica|jessica)\b/gi, "Jessica"],
  [/\b(glenis|glenys|gleny|glen)\b/gi, "Glenys"],
  [/\b(lumína|lumina|lumena|luminia)\b/gi, "Lumina"],
  [/\b(bab|bo|bob)\b/gi, "Bob"],
  [/\b(lina|lena|linda)\b/gi, "Lina"],
  [/\b(neno|neno)\b/gi, "Neno"],
  [/\b(luisa|luiza)\b/gi, "Luisa"],
  [/\b(paco)\b/gi, "Paco"],
  [/\b(pascual|pasqual)\b/gi, "Pascual"],
  [/\b(german|germán|herman)\b/gi, "German"],
  [/\b(nena)\b/gi, "Nena"],
  [/\b(maritza|marisa|maritza)\b/gi, "Maritza"],
  [/\b(esperanza)\b/gi, "Esperanza"],
  [/\b(anibal|aníbal)\b/gi, "Anibal"],
  [/\b(aderly ruiz|aderly|aderli ruiz|aderli)\b/gi, "Aderly Ruiz"],
  [/\b(albert duran|albert durán|albert)\b/gi, "Albert Duran"],
  [/\b(argenis)\b/gi, "Argenis"],
  [/\b(awilda|aguilda|huilda)\b/gi, "Awilda"],
  [/\b(yasmin|yasmín|jazmin|jazmín)\b/gi, "Yasmin"],
  [/\b(helen|ellen)\b/gi, "Helen"],
  [/\b(ileana|iliana|ilena)\b/gi, "Ileana"],
  [/\b(agustina|augustina)\b/gi, "Agustina"],
  [/\b(patricia)\b/gi, "Patricia"],
  [/\b(carmen)\b/gi, "Carmen"],
  [/\b(maria|maría)\b/gi, "Maria"],
  [/\b(hilda|ilda)\b/gi, "Hilda"],
  [/\b(joenfy|joenfi|joemfy|joenfie)\b/gi, "Joenfy"],
  [/\b(johanny|johani|yohanny|yohani)\b/gi, "Johanny"],
  [/\b(raffy|rafi|raffi)\b/gi, "Raffy"],
  [/\b(juanita)\b/gi, "Juanita"],
  [/\b(dtc|dt control|daycare total control)\b/gi, "DTC"],
  [/\b(heygen|hey gen|heigen)\b/gi, "HeyGen"],
  [/\b(elevenlabs|eleven labs|eleven lab)\b/gi, "ElevenLabs"],
  [/\b(felencho mundial)\b/gi, "Felencho Mundial"],
  [/\b(mango power band)\b/gi, "Mango Power Band"],
];

type LuminaMessage = {
  id: string;
  created_at: string;
  conversation_id: string;
  speaker: string;
  target: string | null;
  message: string;
  message_type: string;
  platform: string | null;
  language: string | null;
};

function normalizeLuminaNames(text: string) {
  let normalizedText = text;

  for (const [pattern, replacement] of nameCorrections) {
    normalizedText = normalizedText.replace(pattern, replacement);
  }

  return normalizedText;
}

export default function LuminaVoiceConsolePage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0].id);
  const selectedCharacter =
    characters.find((item) => item.id === selectedCharacterId) || characters[0];

  const [message, setMessage] = useState(selectedCharacter.defaultMessage);
  const [userName, setUserName] = useState(selectedCharacter.defaultUser);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [debug, setDebug] = useState<any>(null);
  const [history, setHistory] = useState<LuminaMessage[]>([]);

  async function loadHistory() {
    try {
      const response = await fetch("/api/lumina/messages", {
        cache: "no-store",
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        const filtered = data
          .filter((item: LuminaMessage) => {
            return item.conversation_id === "lumina-studio-v1";
          })
          .slice(-30);

        setHistory(filtered);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  }

  useEffect(() => {
    loadHistory();

    const timer = setInterval(() => {
      loadHistory();
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  function changeCharacter(characterId: string) {
    const character = characters.find((item) => item.id === characterId);

    if (!character) return;

    setSelectedCharacterId(character.id);
    setMessage(character.defaultMessage);
    setUserName(character.defaultUser);
    setReply("");
    setStatus("");
    setDebug(null);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Este navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setStatus("Escuchando... habla ahora.");

    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";

      if (transcript) {
        const normalizedTranscript = normalizeLuminaNames(transcript);

        setMessage(normalizedTranscript);

        if (normalizedTranscript !== transcript) {
          setStatus(`Voz capturada y corregida: "${transcript}" → "${normalizedTranscript}"`);
        } else {
          setStatus("Voz capturada. Revisa el mensaje y presiona Enviar y hablar.");
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setStatus("Error escuchando el micrófono.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  async function sendMessage() {
    try {
      setLoading(true);
      setStatus("Pensando y generando voz...");
      setReply("");
      setDebug(null);

      const normalizedMessage = normalizeLuminaNames(message);

      if (normalizedMessage !== message) {
        setMessage(normalizedMessage);
      }

      const response = await fetch("/api/lumina/chat-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          user_message: normalizedMessage,
          conversation_id: "lumina-studio-v1",
          channel: "felencho.ai",
          language: "es",
          user_name: normalizeLuminaNames(userName),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("Error.");
        setDebug(data);
        return;
      }

      setReply(data.reply || "");
      setDebug(data.chat || data);

      await loadHistory();

      if (data.audio_base64) {
        const audio = new Audio(
          `data:${data.audio_mime_type || "audio/mpeg"};base64,${data.audio_base64}`
        );

        await audio.play();
        setStatus("Audio reproducido.");
      } else {
        setStatus("Respuesta recibida, pero sin audio.");
      }
    } catch (error: any) {
      setStatus("Error reproduciendo audio.");
      setDebug(error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <h1 className="text-3xl font-bold">Lumina Voice Console</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Consola interna para probar Bob, Lina y Felencho Virtual con memoria, voz, micrófono y corrección de nombres.
          </p>

          <div className="mt-8">
            <label className="mb-2 block text-sm text-zinc-400">Avatar</label>
            <select
              className="w-full rounded-lg bg-zinc-900 p-3 text-white outline-none"
              value={selectedCharacterId}
              onChange={(e) => changeCharacter(e.target.value)}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-zinc-400">Usuario</label>
            <input
              className="w-full rounded-lg bg-zinc-900 p-3 text-white outline-none"
              value={userName}
              onChange={(e) => setUserName(normalizeLuminaNames(e.target.value))}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-zinc-400">Mensaje</label>
            <textarea
              className="w-full rounded-lg bg-zinc-900 p-4 text-white outline-none"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={sendMessage}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Generando..." : "Enviar y hablar"}
            </button>

            <button
              onClick={startListening}
              disabled={isListening || loading}
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {isListening ? "Escuchando..." : "🎤 Escuchar"}
            </button>

            <button
              onClick={() => setMessage(normalizeLuminaNames(message))}
              disabled={loading}
              className="rounded-xl bg-zinc-800 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              Corregir nombres
            </button>
          </div>

          {status && (
            <p className="mt-4 text-sm text-zinc-400">
              Estado: {status}
            </p>
          )}

          {reply && (
            <section className="mt-6 rounded-xl bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">Última respuesta</h2>
              <p className="mt-3 leading-7 text-zinc-200">{reply}</p>
            </section>
          )}

          {debug && (
            <section className="mt-6 rounded-xl bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">Memoria usada</h2>
              <pre className="mt-3 max-h-64 overflow-auto text-xs text-zinc-300">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </section>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Conversación</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Últimos mensajes guardados en lumina_messages.
              </p>
            </div>

            <button
              onClick={loadHistory}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Actualizar
            </button>
          </div>

          <div className="mt-6 max-h-[760px] space-y-4 overflow-y-auto pr-2">
            {history.length === 0 && (
              <p className="text-zinc-500">No hay mensajes todavía.</p>
            )}

            {history.map((item) => {
              const isAvatar = characters.some(
                (character) => character.name === item.speaker
              );

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl p-4 ${
                    isAvatar
                      ? "ml-8 border border-blue-500/20 bg-blue-950/40"
                      : "mr-8 border border-white/10 bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {isAvatar ? "🤖 " : "🧑 "}
                      {item.speaker}
                      {item.target ? ` → ${item.target}` : ""}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <p className="mt-3 leading-7 text-zinc-200">
                    {item.message}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}