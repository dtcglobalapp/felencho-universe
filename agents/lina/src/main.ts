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
    try {
      const character = getCharacter(ctx.job.metadata);
      console.log(
        `[felencho-universe] baseline: ${character.key} -> ${character.lemonsliceAgentId}`,
      );

      const agent = new voice.Agent({
        instructions:
          character.key === "bob"
            ? "Eres Bob. Habla en español de forma breve, serena y natural."
            : "Eres Lina. Habla en español de forma breve, cálida y natural.",
      });

      // Deliberately minimal baseline: no STT, no LLM, no Felencho Brain.
      // We only need TTS to prove LiveKit -> LemonSlice -> avatar video/audio.
      const session = new voice.AgentSession({
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
        }),
      });

      // Current LiveKit LemonSlice docs support using an existing hosted agentId.
      const avatar = new lemonslice.AvatarSession({
        agentId: character.lemonsliceAgentId,
        apiKey: process.env.LEMONSLICE_API_KEY,
        agentPrompt: character.avatarPrompt,
        idleTimeout: 120,
      });

      console.log("[felencho-universe] baseline: starting LemonSlice avatar");
      await avatar.start(session, ctx.room);
      console.log("[felencho-universe] baseline: LemonSlice avatar started");

      await session.start({
        agent,
        room: ctx.room,
        outputOptions: {
          syncTranscription: false,
        },
      });
      console.log("[felencho-universe] baseline: session started");

      await ctx.connect();
      console.log("[felencho-universe] baseline: worker connected");

      await session.say(
        character.key === "bob"
          ? "Hola, soy Bob. Estoy listo."
          : "Hola, soy Lina. Estoy lista.",
      );
      console.log("[felencho-universe] baseline: greeting sent");
    } catch (error) {
      console.error("[felencho-universe] baseline startup error", error);
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
