import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  inference,
  initializeLogger,
  llm,
  voice,
} from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";
import { fileURLToPath } from "node:url";
import { ReadableStream } from "node:stream/web";
import { getCharacterConfig, isCharacterKey } from "./characters.js";

initializeLogger({ pretty: true });

const AGENT_NAME = process.env.AGENT_NAME || "felencho-universe";
const TRANSCRIPTION_TIMEOUT_MS = 5_000;
const FELENCHO_BRAIN_URL =
  process.env.FELENCHO_BRAIN_URL ||
  "https://www.felencho.ai/api/felencho-forever/conversation";

type JobMetadata = {
  character?: "lina" | "bob" | "felencho_virtual";
  participantIdentity?: string;
};

function parseJobMetadata(jobMetadata?: string): JobMetadata {
  if (!jobMetadata) return {};
  try {
    const parsed = JSON.parse(jobMetadata);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function getCharacter(metadata: JobMetadata) {
  let key: "lina" | "bob" | "felencho_virtual" = "lina";
  if (metadata.character && isCharacterKey(metadata.character)) key = metadata.character;

  const character = getCharacterConfig(key);
  if (!character.enabled) throw new Error(`${character.displayName} is not enabled.`);
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

type DialogueTurn = { user: string; assistant: string };
async function askFelenchoBrain(characterKey: string, message: string, conversationContext: DialogueTurn[]): Promise<string> {
  const response = await fetch(FELENCHO_BRAIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_key: characterKey, message, include_audio: false, conversation_context: conversationContext }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Felencho Brain ${response.status}: ${detail}`);
  }

  const payload = await response.json();
  const text = payload?.data?.text;
  if (!text || typeof text !== "string") throw new Error("Felencho Brain returned no text.");
  return text.trim();
}

class FelenchoBrainNodeMarker extends llm.LLM {
  label(): string {
    return "felencho-brain";
  }

  chat(): llm.LLMStream {
    throw new Error("Felencho Brain requests must run through FelenchoBrainAgent.llmNode().");
  }
}

class FelenchoBrainAgent extends voice.Agent {
  // Rolling context is isolated to this active character/session.
  private recentTurns: DialogueTurn[] = [];
  constructor(private readonly characterKey: string, instructions: string) {
    // AgentSession 1.8.1 requires an LLM instance before it schedules a custom llmNode.
    super({ instructions, llm: new FelenchoBrainNodeMarker() });
  }

  async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: voice.ModelSettings,
  ): Promise<ReadableStream<llm.ChatChunk | string> | null> {
    const userText = getLatestUserText(chatCtx);
    if (!userText) return null;
    const brainStartedAt = performance.now();
    console.log(`[felencho-universe] brain input (${this.characterKey}) length=${userText.length}`);
    const answer = await askFelenchoBrain(this.characterKey, userText, this.recentTurns.slice(-4));
    this.recentTurns.push({ user: userText.slice(0, 1500), assistant: answer.slice(0, 1500) });
    if (this.recentTurns.length > 6) this.recentTurns.shift();
    console.log(`[felencho-universe] brain response ready (${this.characterKey}) brainMs=${Math.round(performance.now() - brainStartedAt)}`);

    return new ReadableStream<llm.ChatChunk | string>({
      start(controller) {
        controller.enqueue(answer);
        controller.close();
      },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    let session: voice.AgentSession | undefined;
    let closing: Promise<void> | undefined;

    const closeSession = (reason: string) => {
      if (closing) return closing;
      closing = (async () => {
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
      const metadata = parseJobMetadata(ctx.job.metadata);
      const character = getCharacter(metadata);
      const participantIdentity = metadata.participantIdentity?.trim();
      if (!participantIdentity) {
        throw new Error("Missing studio participant identity for audio input.");
      }

      console.log(
        `[felencho-universe] interactive: job=${ctx.job.id} room=${ctx.room.name} character=${character.key} participant=${participantIdentity}`,
      );

      await ctx.connect();
      console.log(`[felencho-universe] worker connected identity=${ctx.agent?.identity}`);

      const agent = new FelenchoBrainAgent(character.key, character.instructions);

      session = new voice.AgentSession({
        vad: ctx.proc.userData.vad as silero.VAD,
        stt: new inference.STT({ model: "deepgram/nova-3", language: "multi" }),
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
          language: character.ttsLanguage,
        }),
        transcriptionTimeout: TRANSCRIPTION_TIMEOUT_MS,
        turnHandling: {
          turnDetection: "vad",
        },
      });

      session.on(voice.AgentSessionEventTypes.UserStateChanged, (event) => {
        console.log(
          `[felencho-universe] vad state ${event.oldState} -> ${event.newState}`,
        );
      });
      session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
        console.log(
          `[felencho-universe] stt transcript final=${event.isFinal} language=${event.language ?? "unknown"} length=${event.transcript.length}`,
        );
      });
      session.on(voice.AgentSessionEventTypes.UserTranscriptionTimeout, (event) => {
        console.error(
          `[felencho-universe] stt transcript timeout speechMs=${event.speechDuration}`,
        );
        // A single recognizer timeout must not drop the entire room or erase the
        // ongoing conversational context. Subsequent speech turns may recover.
        console.warn("[felencho-universe] keeping voice session open after STT timeout");
      });
      session.on(voice.AgentSessionEventTypes.AgentStateChanged, (event) => {
        console.log(
          `[felencho-universe] agent state ${event.oldState} -> ${event.newState}`,
        );
      });
      session.on(voice.AgentSessionEventTypes.SpeechCreated, (event) => {
        console.log(`[felencho-universe] speech created source=${event.source}`);
      });
      session.on(voice.AgentSessionEventTypes.Error, (event) => {
        const detail =
          event.error instanceof Error ? event.error.message : String(event.error);
        console.error(`[felencho-universe] voice pipeline error: ${detail}`);
      });

      await session.start({
        agent,
        room: ctx.room,
        inputOptions: {
          audioEnabled: true,
          participantIdentity,
          closeOnDisconnect: true,
          deleteRoomOnClose: true,
        },
        // Send voice audio directly into LiveKit; no video avatar required.
        outputOptions: { audioEnabled: true, syncTranscription: false },
      });
      console.log(
        `[felencho-universe] interactive voice session listening to participant=${participantIdentity}`,
      );

      const greeting = session.say(`Hola, soy ${character.displayName}. Estoy listo para escucharte.`);
      await greeting.waitForPlayout();
      console.log("[felencho-universe] interactive greeting played; no arbitrary session timer");
      // Returning the job entrypoint is safe: LiveKit manages the active room's
      // lifecycle until the linked studio participant leaves. closeOnDisconnect
      // and deleteRoomOnClose tear down the agent when the operator ends the session.
      // Never schedule a wall-clock timeout or a second paid dispatch here.
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
