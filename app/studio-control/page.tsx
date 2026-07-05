"use client";

import { useEffect, useState } from "react";

import {
  presenceController,
  PresenceCharacterStatus,
} from "@/lib/PresenceController";

import { presenceStudioController } from "@/lib/PresenceStudioController";

const characters = ["bob", "lina", "felencho"];

export default function StudioControlPage() {
  const [statuses, setStatuses] = useState<PresenceCharacterStatus[]>([]);

  function refresh() {
    setStatuses(characters.map((character) => presenceController.getStatus(character)));
  }

  useEffect(() => {
    refresh();

    return presenceController.subscribe(() => {
      refresh();
    });
  }, []);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6">
          <h1 className="text-4xl font-black text-cyan-300">
            Felencho Studio Control
          </h1>
          <p className="mt-2 text-gray-400">
            Director del estudio: controla quién está presente y quién entra en modo live.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {characters.map((character) => {
            const status =
              statuses.find((item) => item.character === character) ||
              presenceController.getStatus(character);

            return (
              <div
                key={character}
                className="rounded-3xl border border-white/10 bg-zinc-950 p-5"
              >
                <h2 className="text-3xl font-bold capitalize text-yellow-300">
                  {character}
                </h2>

                <div className="mt-4 rounded-2xl bg-black p-4 text-sm text-gray-300">
                  <p>Mode: {status.mode}</p>
                  <p>State: {status.state}</p>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    onClick={() => presenceStudioController.wake(character)}
                    className="rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black"
                  >
                    Despertar
                  </button>

                  <button
                    onClick={() => presenceStudioController.sleep(character)}
                    className="rounded-xl bg-zinc-700 px-4 py-3 font-bold text-white"
                  >
                    Dormir
                  </button>

                  <button
                    onClick={() => presenceStudioController.wakeOnly(character)}
                    className="rounded-xl bg-purple-500 px-4 py-3 font-bold text-white"
                  >
                    Solo {character}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-2xl font-bold text-cyan-300">Control general</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => presenceStudioController.wakeMany(characters)}
              className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black"
            >
              Despertar todos
            </button>

            <button
              onClick={() => presenceStudioController.sleepAll()}
              className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white"
            >
              Dormir todos
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}