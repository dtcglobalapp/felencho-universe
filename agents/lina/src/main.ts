import {
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  inference,
  initializeLogger,
  voice,
} from "@livekit/agents";
import * as lemonslice from "@livekit/agents-plugin-lemonslice";
import { fileURLToPath } from "node:url";
import { getCharacterConfig, isCharacterKey } from "./characters.js";

initializeLogger({ pretty: true });

const AGENT_NAME = process.env.AGENT_NAME || "felencho-universe";
const AVATAR_JOIN_TIMEOUT_MS = 20_000;
const BASELINE_SESSION_TIMEOUT_MS = 45_000;

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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    let avatar: lemonslice.AvatarSession | undefined;
    let session: voice.AgentSession | undefined;
    let failSafe: ReturnType<typeof setTimeout> | undefined;
    let closing: Promise<void> | undefined;

    const closeBaseline = (reason: string) => {
      if (closing) return closing;
      closing = (async () => {
        if (failSafe) clearTimeout(failSafe);
        await avatar?.aclose().catch((error) =>
          console.error("[felencho-universe] baseline: avatar cleanup failed", error),
        );
        await session?.close().catch((error) =>
          console.error("[felencho-universe] baseline: session cleanup failed", error),
        );
        await ctx.deleteRoom().catch((error) =>
          console.error("[felencho-universe] baseline: room cleanup failed", error),
        );
        ctx.shutdown(reason);
      })();
      return closing;
    };

    try {
      const character = getCharacter(ctx.job.metadata);
      console.log(
        `[felencho-universe] baseline: job=${ctx.job.id} room=${ctx.room.name} character=${character.key}`,
      );

      // LemonSlice needs the LiveKit worker participant identity to mint its
      // publish-on-behalf token. Connect before creating the avatar session.
      await ctx.connect();
      console.log(
        `[felencho-universe] baseline: worker connected identity=${ctx.agent?.identity}`,
      );

      failSafe = setTimeout(() => {
        console.error("[felencho-universe] baseline: hard session timeout");
        void closeBaseline("baseline hard timeout");
      }, BASELINE_SESSION_TIMEOUT_MS);

      const agent = new voice.Agent({
        instructions:
          character.key === "bob"
            ? "Eres Bob. Habla en español de forma breve, serena y natural."
            : "Eres Lina. Habla en español de forma breve, cálida y natural.",
      });

      // Deliberately minimal baseline: no STT, no LLM, no Felencho Brain.
      // We only need TTS to prove LiveKit -> LemonSlice -> avatar video/audio.
      session = new voice.AgentSession({
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
        }),
      });

      // Current LiveKit LemonSlice docs support using an existing hosted agentId.
      avatar = new lemonslice.AvatarSession({
        agentId: character.lemonsliceAgentId,
        apiKey: process.env.LEMONSLICE_API_KEY,
        agentPrompt: character.avatarPrompt,
        idleTimeout: 45,
        connOptions: {
          maxRetry: 0,
          retryIntervalMs: 1_000,
          timeoutMs: 10_000,
        },
      });

      console.log("[felencho-universe] baseline: starting LemonSlice avatar");
      await avatar.start(session, ctx.room);
      console.log(
        `[felencho-universe] baseline: LemonSlice session created id=${avatar.sessionId}`,
      );

      await session.start({
        agent,
        room: ctx.room,
        inputOptions: {
          audioEnabled: false,
          closeOnDisconnect: true,
          deleteRoomOnClose: true,
        },
        outputOptions: {
          syncTranscription: false,
        },
      });
      console.log("[felencho-universe] baseline: session started");

      await avatar.waitForJoin({ timeout: AVATAR_JOIN_TIMEOUT_MS });
      console.log("[felencho-universe] baseline: avatar video track published");

      const greeting = session.say(
        character.key === "bob"
          ? "Hola, soy Bob. Estoy listo."
          : "Hola, soy Lina. Estoy lista.",
      );
      await greeting.waitForPlayout();
      console.log("[felencho-universe] baseline: greeting played");
      await closeBaseline("baseline completed");
    } catch (error) {
      console.error("[felencho-universe] baseline startup error", error);
      await closeBaseline("baseline failed");
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
