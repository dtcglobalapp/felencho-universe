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
import * as lemonslice from "@livekit/agents-plugin-lemonslice";
import * as silero from "@livekit/agents-plugin-silero";
import { fileURLToPath } from "node:url";
import { ReadableStream } from "node:stream/web";
import { getCharacterConfig, isCharacterKey } from "./characters.js";

initializeLogger({ pretty: true });

const AGENT_NAME = process.env.AGENT_NAME || "felencho-universe";
const AVATAR_JOIN_TIMEOUT_MS = 60_000;
const SESSION_TIMEOUT_MS = 900_000;
const TRANSCRIPTION_TIMEOUT_MS = 5_000;
const FELENCHO_BRAIN_URL =
  process.env.FELENCHO_BRAIN_URL ||
  "https://www.felencho.ai/api/felencho-forever/conversation";

type JobMetadata = {
  character?: "lina" | "bob" | "felencho_virtual";
  participantIdentity?: string;
  duo?: boolean;
  studioGuestId?: string;
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

async function askFelenchoBrain(characterKey: string, message: string, studioGuestId?: string): Promise<string> {
  const response = await fetch(FELENCHO_BRAIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(studioGuestId && process.env.STUDIO_GUEST_CONTEXT_SECRET ? { "x-studio-guest-secret": process.env.STUDIO_GUEST_CONTEXT_SECRET } : {}) },
    body: JSON.stringify({ character_key: characterKey, message, include_audio: false, ...(studioGuestId ? { studio_guest_id: studioGuestId } : {}) }),
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
  constructor(private readonly characterKey: string, instructions: string, private readonly duo = false, private readonly publishReply?: (text: string) => Promise<void>, private readonly getPeerContext?: () => string, private readonly studioGuestId?: string) {
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
    if (this.duo) {
      const normalized = userText.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const addressedBob = /\bbob\b/.test(normalized);
      const addressedLina = /\blina\b/.test(normalized);
      // Avoid both avatars answering at once; when both are called, Bob goes first.
      const chosen = addressedBob ? "bob" : addressedLina ? "lina" : null;
      if (chosen !== this.characterKey) return null;
    }
    console.log(`[felencho-universe] brain input (${this.characterKey}): ${userText}`);
    const peerContext = this.duo ? (this.getPeerContext?.() || "") : "";
    const brainInput = peerContext ? `Contexto de la mesa redonda (lo dijo el otro participante): ${peerContext}\n\nPregunta actual de Felencho: ${userText}` : userText;
    const answer = await askFelenchoBrain(this.characterKey, brainInput, this.duo ? this.studioGuestId : undefined);
    // Share the reply only after it has been generated; the peer receives text as context,
    // never as microphone input, to avoid endless avatar-to-avatar audio loops.
    if (this.duo) await this.publishReply?.(answer).catch(error => console.error("[duo] sharing reply failed", error));
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
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    let avatar: lemonslice.AvatarSession | undefined;
    let session: voice.AgentSession | undefined;
    let failSafe: ReturnType<typeof setTimeout> | undefined;
    let closing: Promise<void> | undefined;
    let metadataForCleanup: JobMetadata | undefined;

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
        if (metadataForCleanup?.duo !== true) await ctx.deleteRoom().catch((error) =>
          console.error("[felencho-universe] room cleanup failed", error),
        );
        ctx.shutdown(reason);
      })();
      return closing;
    };

    try {
      const metadata = parseJobMetadata(ctx.job.metadata);
      metadataForCleanup = metadata;
      const character = getCharacter(metadata);
      const participantIdentity = metadata.participantIdentity?.trim();
      if (!participantIdentity) {
        throw new Error("Missing studio participant identity for audio input.");
      }

      console.log(
        `[felencho-universe] interactive: job=${ctx.job.id} room=${ctx.room.name} character=${character.key} participant=${participantIdentity}`,
      );

      await ctx.connect();
      // A deleted LiveKit room must also terminate the paid LemonSlice avatar.
      (ctx.room as any).on("disconnected", () => {
        console.log("[felencho-universe] room disconnected; closing paid avatar");
        void closeSession("room disconnected");
      });
      console.log(`[felencho-universe] worker connected identity=${ctx.agent?.identity}`);

      failSafe = setTimeout(() => {
        console.error("[felencho-universe] interactive hard timeout");
        void closeSession("interactive hard timeout");
      }, SESSION_TIMEOUT_MS);

      let peerContext = "";
      if (metadata.duo === true) {
        (ctx.room as any).on("dataReceived", (payload: Uint8Array, participant: any, _kind: unknown, topic?: string) => {
          if (topic !== "duo-peer") return;
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data?.character !== character.key && typeof data?.text === "string") {
              peerContext = String(data.character) + ": " + data.text.slice(0, 1800);
              console.log("[duo] peer context received from " + data.character);
            }
          } catch (error) { console.error("[duo] invalid peer context", error); }
        });
      }
      const publishReply = async (answer: string) => {
        if (metadata.duo !== true) return;
        const bytes = new TextEncoder().encode(JSON.stringify({character: character.key, text: answer.slice(0, 1800)}));
        await (ctx.room.localParticipant as any).publishData(bytes, { reliable: true, topic: "duo-peer" });
      };
      const agent = new FelenchoBrainAgent(character.key, character.instructions, metadata.duo === true, publishReply, () => peerContext, metadata.studioGuestId);

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
          `[felencho-universe] stt transcript final=${event.isFinal} language=${event.language ?? "unknown"} text=${event.transcript}`,
        );
      });
      session.on(voice.AgentSessionEventTypes.UserTranscriptionTimeout, (event) => {
        console.error(
          `[felencho-universe] stt transcript timeout speechMs=${event.speechDuration}`,
        );
        void closeSession("stt transcript timeout");
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

      avatar = new lemonslice.AvatarSession({
        agentId: character.lemonsliceAgentId,
        apiKey: process.env.LEMONSLICE_API_KEY,
        agentPrompt: character.avatarPrompt,
        idleTimeout: 900,
        connOptions: { maxRetry: 2, retryIntervalMs: 2_000, timeoutMs: 20_000 },
      });

      console.log(`[felencho-universe] starting LemonSlice avatar character=${character.key} agentId=${character.lemonsliceAgentId} apiKeyConfigured=${Boolean(process.env.LEMONSLICE_API_KEY)}`);
      await avatar.start(session, ctx.room);
      console.log(`[felencho-universe] LemonSlice session created id=${avatar.sessionId}`);

      await session.start({
        agent,
        room: ctx.room,
        inputOptions: {
          audioEnabled: true,
          participantIdentity,
          closeOnDisconnect: true,
          deleteRoomOnClose: metadata.duo !== true,
        },
        outputOptions: { syncTranscription: false },
      });
      console.log(
        `[felencho-universe] interactive voice session listening to participant=${participantIdentity}`,
      );

      await avatar.waitForJoin({ timeout: AVATAR_JOIN_TIMEOUT_MS });
      console.log("[felencho-universe] avatar video track published");

      if (metadata.duo !== true) {
        const greeting = session.say(`Hola, soy ${character.displayName}. Estoy listo para escucharte.`);
        await greeting.waitForPlayout();
      }
      console.log("[felencho-universe] interactive greeting played; keeping job alive");

      await new Promise<void>((resolve) => setTimeout(resolve, SESSION_TIMEOUT_MS));
      if (!closing) await closeSession("interactive session timeout");
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
