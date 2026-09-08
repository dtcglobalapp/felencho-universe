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
import { ReadableStream } from "node:stream/web";
import {
  type CharacterConfig,
  type CharacterKey,
  getCharacterConfig,
  isCharacterKey,
} from "./characters.js";

dotenv.config();

const AGENT_NAME = process.env.AGENT_NAME || "felencho-universe";
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

function resolveCharacter(ctx: JobContext): CharacterConfig {
  let requested: CharacterKey = "lina";

  if (ctx.job.metadata) {
    try {
      const metadata = JSON.parse(ctx.job.metadata);
      if (isCharacterKey(metadata?.character)) {
        requested = metadata.character;
      }
    } catch {
      // Ignore malformed metadata and fall back to Lina.
    }
  }

  const config = getCharacterConfig(requested);

  if (!config.enabled) {
    throw new Error(`${config.displayName} is reserved but not enabled yet.`);
  }

  if (!config.imageUrl) {
    throw new Error(`Missing avatar image URL for ${config.displayName}.`);
  }

  return config;
}

async function askCharacterBrain(
  characterKey: CharacterKey,
  message: string,
): Promise<string> {
  const response = await fetch(FELENCHO_BRAIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      character_key: characterKey,
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
    throw new Error(`Felencho Brain returned no text for ${characterKey}.`);
  }

  return text.trim();
}

class FelenchoUniverseCharacterAgent extends voice.Agent {
  private readonly character: CharacterConfig;

  constructor(character: CharacterConfig) {
    super({ instructions: character.instructions });
    this.character = character;
  }

  async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: voice.ModelSettings,
  ): Promise<ReadableStream<llm.ChatChunk | string> | null> {
    const userText = getLatestUserText(chatCtx);

    if (!userText) return null;

    const answer = await askCharacterBrain(this.character.key, userText);

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
    const jobId = ctx.job.id;

    try {
      console.log(`[felencho-universe] job ${jobId}: entry started`);
      console.log(
        `[felencho-universe] job ${jobId}: job metadata=${ctx.job.metadata || "<empty>"}`,
      );

      const character = resolveCharacter(ctx);
      console.log(
        `[felencho-universe] job ${jobId}: character=${character.key}, image=${character.imageUrl}`,
      );

      const session = new voice.AgentSession({
        stt: new inference.STT({
          model: "deepgram/nova-3",
          language: "multi",
        }),
        llm: new inference.LLM({
          model: "google/gemma-4-31b-it",
        }),
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
          language: character.ttsLanguage,
        }),
      });

      console.log(`[felencho-universe] job ${jobId}: connecting to room`);
      await ctx.connect();
      console.log(`[felencho-universe] job ${jobId}: connected to room`);

      const avatar = new lemonslice.AvatarSession({
        agentImageUrl: character.imageUrl,
        agentPrompt: character.avatarPrompt,
      });

      console.log(`[felencho-universe] job ${jobId}: starting LemonSlice avatar`);
      await avatar.start(session, ctx.room);
      console.log(`[felencho-universe] job ${jobId}: LemonSlice avatar started`);

      console.log(`[felencho-universe] job ${jobId}: starting voice session`);
      await session.start({
        agent: new FelenchoUniverseCharacterAgent(character),
        room: ctx.room,
        inputOptions: {
          noiseCancellation: BackgroundVoiceCancellation(),
        },
        outputOptions: {
          audioEnabled: false,
        },
      });
      console.log(`[felencho-universe] job ${jobId}: voice session started`);
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      console.error(`[felencho-universe] job ${jobId}: startup failed`, message);
      throw error;
    }
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
