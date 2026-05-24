"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function SongPage() {
  const params = useParams();

  const slug = params.slug as string;

  const song = getSongBySlug(slug);

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
      <main className="flex min-h-screen items-center justify-center bg-black text-center text-white">
        <div>
          <h1 className="text-5xl font-black">
            Song not found
          </h1>

          <Link
            href="/"
            className="mt-6 inline-block text-cyan-400"
          >
            Back to Felencho Universe
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black text-white">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage: `url(${song.poster})`,
        }}
      />

      {/* VIDEO */}
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

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/90" />

      {/* HEADER */}
      <header className="absolute left-0 top-0 z-30 flex w-full items-start justify-between p-5 md:p-8">

        <Link href="/">
          <div>
            <h1 className="text-2xl font-black tracking-[0.32em] text-cyan-400 md:text-3xl">
              FELENCHO
            </h1>

            <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-gray-300 md:text-sm">
              Lyric Universe
            </p>
          </div>
        </Link>

        <div className="flex flex-col items-end gap-3">

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value as LanguageKey)
            }
            className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-xl"
          >
            {Object.entries(languages).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {key.toUpperCase()} · {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSound}
            className="rounded-full border border-cyan-400/60 bg-black/55 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black"
          >
            {soundOn ? "Sound On" : "Sound"}
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-40 pt-36 text-center">

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-cyan-300"
        >
          {song.album}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 45 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="max-w-5xl text-5xl font-black uppercase leading-none md:text-8xl"
        >
          {song.title[language]}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 max-w-3xl text-sm leading-relaxed text-gray-200 md:text-xl"
        >
          {song.story[language]}
        </motion.p>

        <div className="mt-5 text-xs uppercase tracking-[0.25em] text-gray-400">
          Composer · {song.composer}
        </div>

        {/* LYRICS */}
        <motion.div
          key={activeLine + language}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 max-w-4xl rounded-3xl border border-cyan-400/20 bg-black/45 p-6 backdrop-blur-xl md:p-10"
        >
          <p className="text-2xl font-black leading-tight md:text-5xl">
            {song.lyrics[activeLine]?.lines[language]}
          </p>

          {language !== "es" && (
            <p className="mt-5 text-sm text-cyan-200 md:text-xl">
              {song.lyrics[activeLine]?.lines.es}
            </p>
          )}
        </motion.div>
      </section>

      {/* FOOTER PLAYER */}
      <section className="absolute bottom-0 left-0 z-30 w-full p-4">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-black/55 p-5 backdrop-blur-xl">

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