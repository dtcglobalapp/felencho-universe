"use client";

import { useEffect, useRef, useState } from "react";

import StudioSync from "@/lib/StudioSync";
import {
  presenceController,
  PresenceCharacterStatus,
} from "@/lib/PresenceController";

const studioId = "new_york_physical";
const characters = ["bob", "lina", "felencho"];

export default function StudioControlPage() {
  const syncRef = useRef<StudioSync | null>(null);
  const [statuses, setStatuses] = useState<PresenceCharacterStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 50)
    );
  }

  function refresh() {
    setStatuses(
      characters.map((character) => presenceController.getStatus(character))
    );
  }

  useEffect(() => {
    const sync = new StudioSync({
      studioId,
      onLog: addLog,
    });

    syncRef.current = sync;

    sync.loadInitialState();
    sync.subscribe();
    refresh();

    const unsubscribePresence = presenceController.subscribe(() => {
      refresh();
    });

    return () => {
      unsubscribePresence();
      sync.unsubscribe();
      syncRef.current = null;
    };
  }, []);

  async function wake(character: string) {
    await syncRef.current?.setLive(character);
  }

  async function sleep(character: string) {
    await syncRef.current?.setPresence(character);
  }

  async function wakeOnly(character: string) {
    await syncRef.current?.wakeOnly(character, characters);
  }

  async function wakeAll() {
    await Promise.all(characters.map((character) => wake(character)));
  }

  async function sleepAll() {
    await syncRef.current?.sleepAll(characters);
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6">
          <h1 className="text-4xl font-black text-cyan-300">
            Felencho Studio Control
          </h1>
          <p className="mt-2 text-gray-400">
            Director global conectado a Supabase Realtime.
          </p>
          <p className="mt-2 text-sm text-gray-500">Studio: {studioId}</p>
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
                    onClick={() => wake(character)}
                    className="rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black"
                  >
                    Despertar
                  </button>

                  <button
                    onClick={() => sleep(character)}
                    className="rounded-xl bg-zinc-700 px-4 py-3 font-bold text-white"
                  >
                    Dormir
                  </button>

                  <button
                    onClick={() => wakeOnly(character)}
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
              onClick={wakeAll}
              className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black"
            >
              Despertar todos
            </button>

            <button
              onClick={sleepAll}
              className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white"
            >
              Dormir todos
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-2xl font-bold text-purple-300">Logs</h2>
          <div className="mt-4 max-h-72 overflow-auto rounded-2xl bg-black p-4 text-sm text-gray-300">
            {logs.length === 0 ? (
              <p className="text-gray-500">Sin eventos todavía.</p>
            ) : (
              logs.map((log, index) => <p key={index}>{log}</p>)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}