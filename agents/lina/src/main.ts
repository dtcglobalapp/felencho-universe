import {
  type JobContext,
  inference,
  llm,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as lemonslice from "@livekit/agents-plugin-lemonslice";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Local development only. LiveKit Cloud injects its own secrets at runtime.
dotenv.config();

const AGENT_NAME = process.env.AGENT_NAME || "lina-felencho";
const LINA_IMAGE_URL =
  process.env.LINA_IMAGE_URL ||
  "https://www.felencho.ai/avatars/lina/lina-2x3.jpg";
const FELENCHO_BRAIN_URL =
  process.env.FELENCHO_BRAIN_URL ||
  "https://www.felencho.ai/api/felencho-forever/conversation";

if (!process.env.LEMONSLICE_API_KEY) {
  throw new Error("Missing required env var: LEMONSLICE_API_KEY");
}

function getLatestUserText(chatCtx: llm.ChatContext): string {
  for (let i = chatCtx.items.length - 1; i >= 0; i -= 1) {
    const item = chatCtx.items[i] as any;
    if (item?.type === "message" && item?.role === "user") {
      return String(item.textContent || "").trim();
    }
  }
  return "";
}

async function askLinaBrain(message: string): Promise<string> {
  const response = await fetch(FELENCHO_BRAIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      character_key: "lina",
      message,
      include_audio: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Felencho Brain error ${response.status}: ${details}`);
  }

  const payload = await response.json();
  const text = payload?.data?.text;

  if (!text || typeof text !== "string") {
    throw new Error("Felencho Brain returned no text for Lina.");
  }

  return text.trim();
}

class LinaAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `
Eres Lina dentro de Felencho Forever.
Tu identidad, conocimiento y memoria vienen de Felencho Brain.
Hablas de forma cálida, inteligente, breve y natural para conversación en vivo.
Nunca inventes datos ni menciones detalles internos de APIs o proveedores.
`.trim(),
    });
  }

  async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: voice.ModelSettings,
  ): Promise<ReadableStream<llm.ChatChunk | string> | null> {
    const userText = getLatestUserText(chatCtx);

    if (!userText) return null;

    const answer = await askLinaBrain(userText);

    return new ReadableStream<llm.ChatChunk | string>({
      start(controller) {
        controller.enqueue(answer);
        controller.close();
      },
    });
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const session = new voice.AgentSession({
      // Multilingual recognition so Lina can hear Spanish and English in the studio.
      stt: new inference.STT({
        model: "deepgram/nova-3",
        language: "multi",
      }),
      // Kept as a fallback pipeline model. Lina's llmNode routes actual answers
      // through Felencho Brain instead of this model.
      llm: new inference.LLM({
        model: "google/gemma-4-31b-it",
      }),
      // First test voice. We can swap the generic voice later without changing Lina's brain.
      tts: new inference.TTS({
        model: "cartesia/sonic-3",
        voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        language: "es",
      }),
      turnHandling: {
        interruption: {
          resumeFalseInterruption: true,
        },
      },
    });

    await ctx.connect();

    const avatar = new lemonslice.AvatarSession({
      agentImageUrl: LINA_IMAGE_URL,
      agentPrompt:
        "Lina is a poised futuristic female android host. Natural human hand gestures, subtle head movement, attentive listening posture, calm studio presence.",
    });

    // LemonSlice becomes the audio/video output layer for the session.
    await avatar.start(session, ctx.room);

    await session.start({
      agent: new LinaAgent(),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
      outputOptions: {
        audioEnabled: false,
      },
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
