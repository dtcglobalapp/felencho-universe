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
  if (!character.imageUrl) {
    throw new Error(`Missing image URL for ${character.displayName}.`);
  }
  return character;
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    try {
      const character = getCharacter(ctx.job.metadata);
      console.log(`[felencho-universe] starting ${character.key} with ${character.imageUrl}`);

      const agent = new voice.Agent({
        instructions:
          character.key === "bob"
            ? "Eres Bob. Habla en español de forma breve, serena y natural."
            : "Eres Lina. Habla en español de forma breve, cálida y natural.",
      });

      const session = new voice.AgentSession({
        stt: new inference.STT({
          model: "deepgram/nova-3",
          language: "es",
        }),
        llm: new inference.LLM({
          model: "openai/gpt-4.1-mini",
        }),
        tts: new inference.TTS({
          model: "cartesia/sonic-3",
          voice: character.ttsVoice,
        }),
        turnHandling: {
          interruption: {
            resumeFalseInterruption: false,
          },
          preemptiveGeneration: {
            enabled: true,
          },
        },
      });

      await session.start({
        agent,
        room: ctx.room,
        outputOptions: {
          syncTranscription: false,
        },
      });
      console.log("[felencho-universe] session started");

      const avatar = new lemonslice.AvatarSession({
        agentImageUrl: character.imageUrl,
        agentPrompt: character.avatarPrompt,
      });

      await avatar.start(session, ctx.room);
      console.log("[felencho-universe] LemonSlice avatar started");

      session.generateReply({
        instructions:
          character.key === "bob"
            ? "Saluda brevemente como Bob y confirma que estás listo."
            : "Saluda brevemente como Lina y confirma que estás lista.",
      });

      await ctx.connect();
      console.log("[felencho-universe] worker connected");
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
