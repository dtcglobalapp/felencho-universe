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

function characterFromMetadata(rawMetadata?: string): CharacterKey {
  if (!rawMetadata) return "lina";
  try {
    const metadata = JSON.parse(rawMetadata);
    return isCharacterKey(metadata?.character) ? metadata.character : "lina";
  } catch {
    return "lina";
  }
}

function resolveCharacter(jobMetadata?: string): CharacterConfig {
  const config = getCharacterConfig(characterFromMetadata(jobMetadata));
  if (!config.enabled) {
    throw new Error(`${config.displayName} is reserved but not enabled yet.`);
  }
  if (!config.imageUrl) {
    throw new Error(`Missing avatar image URL for ${config.displayName}.`);
  }
  return config;
}

async function askCharacterBrain(characterKey: CharacterKey, message: string): Promise<string> {
  const response = await fetch(FELENCHO_BRAIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  constructor(private readonly character: CharacterConfig) {
    super({ instructions: character.instructions });
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
      const character = resolveCharacter(ctx.job.metadata);
      console.log(
        `[felencho-universe] job ${jobId}: character=${character.key}, image=${character.imageUrl}`,
      );

      const session = new voice.AgentSession({
        stt: new inference.STT({ model: "deepgram/nova-3", language: "multi" }),
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
          language: character.ttsLanguage,
        }),
      });

      // Follow LiveKit's official LemonSlice example order exactly:
      // 1) start AgentSession, 2) start avatar, 3) connect worker to room.
      await session.start({
        agent: new FelenchoUniverseCharacterAgent(character),
        room: ctx.room,
        outputOptions: { syncTranscription: false },
      });
      console.log(`[felencho-universe] job ${jobId}: voice session started`);

      // Use the public image URL first because this is the path used by the
      // official working example. Hosted LemonSlice agent IDs remain in the
      // character registry for later optimization after the base flow is stable.
      const avatar = new lemonslice.AvatarSession({
        agentImageUrl: character.imageUrl,
        agentPrompt: character.avatarPrompt,
        idleTimeout: 300,
      });

      console.log(`[felencho-universe] job ${jobId}: starting LemonSlice avatar`);
      await avatar.start(session, ctx.room);
      console.log(`[felencho-universe] job ${jobId}: LemonSlice avatar started`);

      await ctx.connect();
      console.log(`[felencho-universe] job ${jobId}: worker connected`);
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
