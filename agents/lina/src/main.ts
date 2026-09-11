import {
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  inference,
  initializeLogger,
  llm,
  voice,
} from "@livekit/agents";
import * as lemonslice from "@livekit/agents-plugin-lemonslice";
import { fileURLToPath } from "node:url";
import { ReadableStream } from "node:stream/web";
import { getCharacterConfig, isCharacterKey } from "./characters.js";

initializeLogger({ pretty: true });

const AGENT_NAME = process.env.AGENT_NAME || "felencho-universe";
const AVATAR_JOIN_TIMEOUT_MS = 20_000;
const SESSION_TIMEOUT_MS = 900_000;
const FELENCHO_BRAIN_URL =
  process.env.FELENCHO_BRAIN_URL ||
  "https://www.felencho.ai/api/felencho-forever/conversation";

function getCharacter(jobMetadata?: string) {
  let key: "lina" | "bob" | "felencho_virtual" = "lina";

  if (jobMetadata) {
    try {
      const parsed = JSON.parse(jobMetadata);
      if (isCharacterKey(parsed?.character)) key = parsed.character;
    } catch {
      // fall back to Lina
    }
  }

  const character = getCharacterConfig(key);

  if (!character.enabled) {
    throw new Error(`${character.displayName} is not enabled.`);
  }

  if (!character.lemonsliceAgentId) {
    throw new Error(`Missing LemonSlice agent ID for ${character.displayName}.`);
  }

  return character;
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

async function askFelenchoBrain(characterKey: string, message: string): Promise<string> {
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
    const detail = await response.text();
    throw new Error(`Felencho Brain ${response.status}: ${detail}`);
  }

  const payload = await response.json();
  const text = payload?.data?.text;
  if (!text || typeof text !== "string") {
    throw new Error("Felencho Brain returned no text.");
  }

  return text.trim();
}

class FelenchoBrainAgent extends voice.Agent {
  constructor(private readonly characterKey: string, instructions: string) {
    super({ instructions });
  }

  async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: voice.ModelSettings,
  ): Promise<ReadableStream<llm.ChatChunk | string> | null> {
    const userText = getLatestUserText(chatCtx);
    if (!userText) return null;

    console.log(`[felencho-universe] brain input (${this.characterKey}): ${userText}`);
    const answer = await askFelenchoBrain(this.characterKey, userText);
    console.log(`[felencho-universe] brain response ready (${this.characterKey})`);

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
    let avatar: lemonslice.AvatarSession | undefined;
    let session: voice.AgentSession | undefined;
    let failSafe: ReturnType<typeof setTimeout> | undefined;
    let closing: Promise<void> | undefined;

    const closeSession = (reason: string) => {
      if (closing) return closing;
      closing = (async () => {
        if (failSafe) clearTimeout(failSafe);
        await avatar?.aclose().catch((error) =>
          console.error("[felencho-universe] avatar cleanup failed", error),
        );
        await session?.close().catch((error) =>
          console.error("[felencho-universe] session cleanup failed", error),
        );
        await ctx.deleteRoom().catch((error) =>
          console.error("[felencho-universe] room cleanup failed", error),
        );
        ctx.shutdown(reason);
      })();
      return closing;
    };

    try {
      const character = getCharacter(ctx.job.metadata);
      console.log(
        `[felencho-universe] interactive: job=${ctx.job.id} room=${ctx.room.name} character=${character.key}`,
      );

      await ctx.connect();
      console.log(
        `[felencho-universe] worker connected identity=${ctx.agent?.identity}`,
      );

      failSafe = setTimeout(() => {
        console.error("[felencho-universe] interactive hard timeout");
        void closeSession("interactive hard timeout");
      }, SESSION_TIMEOUT_MS);

      const agent = new FelenchoBrainAgent(character.key, character.instructions);

      session = new voice.AgentSession({
        stt: new inference.STT({
          model: "deepgram/nova-3",
          language: "multi",
        }),
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
          language: character.ttsLanguage,
        }),
      });

      avatar = new lemonslice.AvatarSession({
        agentId: character.lemonsliceAgentId,
        apiKey: process.env.LEMONSLICE_API_KEY,
        agentPrompt: character.avatarPrompt,
        idleTimeout: 900,
        connOptions: {
          maxRetry: 0,
          retryIntervalMs: 1_000,
          timeoutMs: 10_000,
        },
      });

      console.log("[felencho-universe] starting LemonSlice avatar");
      await avatar.start(session, ctx.room);
      console.log(`[felencho-universe] LemonSlice session created id=${avatar.sessionId}`);

      await session.start({
        agent,
        room: ctx.room,
        inputOptions: {
          audioEnabled: true,
          closeOnDisconnect: true,
          deleteRoomOnClose: true,
        },
        outputOptions: {
          syncTranscription: false,
        },
      });
      console.log("[felencho-universe] interactive voice session started");

      await avatar.waitForJoin({ timeout: AVATAR_JOIN_TIMEOUT_MS });
      console.log("[felencho-universe] avatar video track published");

      const greeting = session.say("Hola, soy Lina. Ya estoy conectada a Felencho Brain y puedo escucharte.");
      await greeting.waitForPlayout();
      console.log("[felencho-universe] interactive greeting played; keeping job alive");

      await new Promise<void>((resolve) => setTimeout(resolve, SESSION_TIMEOUT_MS));

      if (!closing) {
        await closeSession("interactive session timeout");
      }
    } catch (error) {
      console.error("[felencho-universe] interactive startup error", error);
      await closeSession("interactive failed");
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
