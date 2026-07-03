"use client";

const screens = [
  {
    name: "Bob",
    status: "Listo para prueba",
    route: "/lumina/liveavatar-test",
    description: "Bob conectado a LiveAvatar + Felencho Brain.",
  },
  {
    name: "Lina",
    status: "Pantalla temporal",
    route: "/lumina",
    description: "Lina estará aquí mientras conectamos su LiveAvatar.",
  },
  {
    name: "Felencho Virtual",
    status: "Gateway activo",
    route: "/felencho-live/felencho",
    description: "Felencho Virtual usando FelenchoGateway.",
  },
];

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-black via-slate-950 to-black p-8 text-center">
          <h1 className="text-5xl font-black text-cyan-300">
            Felencho Studio
          </h1>
          <p className="mt-3 text-gray-300">
            Live control room for Bob, Lina and Felencho Virtual.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {screens.map((screen) => (
            <div
              key={screen.name}
              className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-yellow-300">
                  {screen.name}
                </h2>
                <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
                  {screen.status}
                </span>
              </div>

              <div className="flex aspect-[9/16] items-center justify-center rounded-2xl border border-cyan-500/20 bg-black">
                <div className="text-center">
                  <p className="text-6xl">🎙️</p>
                  <p className="mt-4 text-xl font-bold">{screen.name}</p>
                  <p className="mt-2 px-6 text-sm text-gray-400">
                    {screen.description}
                  </p>
                </div>
              </div>

              <a
                href={screen.route}
                target="_blank"
                className="mt-5 block rounded-xl bg-cyan-400 px-5 py-3 text-center font-bold text-black"
              >
                Abrir pantalla
              </a>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}