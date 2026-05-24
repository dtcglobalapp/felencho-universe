"use client";

import { motion } from "framer-motion";

const albums = [
  {
    id: "01",
    title: "Yo Soy Felencho",
    description:
      "Bachatón urbano futurista con energía cyberpunk caribeña.",
    color: "text-cyan-400",
  },
  {
    id: "02",
    title: "Freedom Island",
    description:
      "Reggae atmosférico con vibras tropicales y libertad espiritual.",
    color: "text-green-400",
  },
  {
    id: "PODCAST",
    title: "Felencho Mundial",
    description:
      "IA, música, cultura, tecnología, filosofía y despertar humano.",
    color: "text-fuchsia-400",
  },
  {
    id: "HISTORIA",
    title: "Museo IA",
    description:
      "Alan Turing, evolución tecnológica, personajes y memoria digital.",
    color: "text-yellow-400",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* VIDEO BACKGROUND */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
      >
        <source src="/videos/times-square-rain.mp4" type="video/mp4" />
      </video>

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black"></div>

      {/* TOP BAR */}
      <header className="absolute top-0 left-0 z-30 flex w-full items-start justify-between p-5 md:p-8">

        {/* LOGO */}
        <div>
          <h1 className="text-2xl font-black tracking-[0.3em] text-cyan-400 md:text-4xl">
            FELENCHO
          </h1>

          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-gray-300 md:text-sm">
            Universe Experience
          </p>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex flex-col items-end gap-3">

          {/* LANGUAGE */}
          <button className="rounded-full border border-white/20 bg-black/40 px-4 py-3 text-sm font-semibold backdrop-blur-xl transition hover:bg-white hover:text-black">
            🇪🇸 ES • Español
          </button>

          {/* SOUND */}
          <button className="rounded-full border border-cyan-400 bg-cyan-400/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black">
            Sonido Activo
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-[420px] pt-36 text-center sm:pb-64 md:pb-56">

        <motion.h1
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="max-w-6xl text-5xl font-black uppercase leading-none sm:text-6xl md:text-8xl"
        >
          Yo Soy{" "}
          <span className="text-cyan-400 drop-shadow-[0_0_35px_rgba(34,211,238,0.95)]">
            Felencho
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 max-w-3xl text-base text-gray-300 sm:text-xl md:text-2xl"
        >
          Música. Podcast. Historia. Inteligencia Artificial. Caribe.
          Futuro.
        </motion.p>

        {/* BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >

          <button className="rounded-full border border-cyan-400 bg-cyan-400/15 px-6 py-4 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black md:px-10 md:text-lg">
            Enter Universe
          </button>

          <button className="rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-bold uppercase tracking-[0.25em] backdrop-blur-xl transition hover:bg-white hover:text-black md:px-10 md:text-lg">
            Watch Videos
          </button>

          <button className="rounded-full border border-fuchsia-400 bg-fuchsia-400/10 px-6 py-4 text-sm font-bold uppercase tracking-[0.25em] text-fuchsia-300 backdrop-blur-xl transition hover:bg-fuchsia-400 hover:text-black md:px-10 md:text-lg">
            Podcast
          </button>

        </motion.div>
      </section>

      {/* ALBUMS */}
      <section className="absolute bottom-0 left-0 z-30 w-full p-3 sm:p-5 md:p-8">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.4 + index * 0.2,
                duration: 0.8,
              }}
              className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-xl sm:rounded-3xl sm:p-5"
            >

              <p
                className={`text-xs uppercase tracking-[0.35em] ${album.color}`}
              >
                {album.id}
              </p>

              <h3 className="mt-2 text-lg font-black sm:text-2xl md:text-3xl">
                {album.title}
              </h3>

              <p className="mt-2 text-xs text-gray-300 sm:text-sm md:text-base">
                {album.description}
              </p>

            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}