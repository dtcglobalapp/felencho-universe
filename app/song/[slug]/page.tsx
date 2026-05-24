"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getSongBySlug, LanguageKey } from "../../../data/songs";

const languages: Record<LanguageKey, { flag: string; name: string }> = {
  es: { flag: "🇪🇸", name: "Español" },
  en: { flag: "🇺🇸", name: "English" },
  fr: { flag: "🇫🇷", name: "Français" },
  pt: { flag: "🇧🇷", name: "Português" },
  ja: { flag: "🇯🇵", name: "日本語" },
  zh: { flag: "🇨🇳", name: "中文" },
  hi: { flag: "🇮🇳", name: "हिन्दी" },
  ar: { flag: "🇸🇦", name: "العربية" },
};

export default function SongPage({
  params,
}: {
  params: { slug: string };
}) {
  const song = getSongBySlug(params.slug);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [language, setLanguage] = useState<LanguageKey>("es");
  const [soundOn, setSoundOn] = useState(false);
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!videoRef.current || !song) return;

      const current = videoRef.current.currentTime;

      const currentLine = song.lyrics.findIndex((line, index) => {
        const next = song.lyrics[index + 1];
        return current >= line.time && (!next || current < next.time);
      });

      if (currentLine >= 0) {
        setActiveLine(currentLine);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [song]);

  const toggleSound = async () => {
    if (!videoRef.current) return;

    try {
      await videoRef.current.play();
    } catch {}

    videoRef.current.muted = soundOn;
    videoRef.current.volume = soundOn ? 0 : 0.7;
    setSoundOn(!soundOn);
  };

  if (!song) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-8 text-center text-white">
        <div>
          <h1 className="text-4xl font-black">Song not found</h1>
          <Link href="/" className="mt-6 inline-block text-cyan-400">
            Back to Felencho Universe
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(${song.poster})` }}
      />

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={song.poster}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
      >
        <source src={song.video} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.12),transparent_55%)]" />

      <header className="absolute left-0 top-0 z-30 flex w-full items-start justify-between gap-3 p-4 md:p-8">
        <Link href="/">
          <div>
            <h1 className="text-xl font-black tracking-[0.32em] text-cyan-400 drop-shadow-[0_0_18px_cyan] md:text-3xl">
              FELENCHO
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-gray-200 md:text-sm">
              Lyric Universe
            </p>
          </div>
        </Link>

        <div className="flex flex-col items-end gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageKey)}
            className="max-w-[180px] rounded-full border border-white/20 bg-black/65 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xl outline-none"
          >
            {Object.entries(languages).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {key.toUpperCase()} · {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSound}
            className="rounded-full border border-cyan-400/60 bg-black/55 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black"
          >
            {soundOn ? "Sound On" : "Sound"}
          </button>
        </div>
      </header>

      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-44 pt-32 text-center">
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300"
        >
          {song.album}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 55 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1 }}
          className="max-w-5xl text-5xl font-black uppercase leading-none md:text-8xl"
        >
          {song.title[language]}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 max-w-3xl text-sm leading-relaxed text-gray-200 md:text-xl"
        >
          {song.story[language]}
        </motion.p>

        <div className="mt-5 text-xs uppercase tracking-[0.25em] text-gray-400">
          Composer · {song.composer}
        </div>

        <motion.div
          key={activeLine + language}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-10 max-w-4xl rounded-3xl border border-cyan-400/25 bg-black/45 p-6 text-center backdrop-blur-xl md:p-8"
        >
          <p className="text-2xl font-black leading-tight text-white md:text-5xl">
            {song.lyrics[activeLine]?.lines[language]}
          </p>

          {language !== "es" && (
            <p className="mt-4 text-sm text-cyan-200 md:text-xl">
              {song.lyrics[activeLine]?.lines.es}
            </p>
          )}
        </motion.div>
      </section>

      <section className="absolute bottom-0 left-0 z-30 w-full p-4">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-black/55 p-4 backdrop-blur-xl md:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">
                Now Playing
              </p>
              <h3 className="mt-1 text-xl font-black">
                {song.title[language]}
              </h3>
            </div>

            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-200"
            >
              Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}