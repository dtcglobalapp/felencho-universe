"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Card = {
  tag: string;
  title: string;
  text: string;
  href: string;
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Songs", href: "/song/tinta-triste" },
  { label: "Podcast", href: "/podcast" },
  { label: "Museum", href: "/museum" },
  { label: "Novels", href: "/novels" },
];

const languages = {
  ES: {
    flag: "🇪🇸",
    name: "Español",
    title: "Yo Soy",
    subtitle: "Música. Podcast. Historia. Inteligencia Artificial. Caribe. Futuro.",
    enter: "Entrar",
    videos: "Videos",
    podcast: "Podcast",
    soundOff: "Sonido",
    soundOn: "Sonido activo",
    universe: "Universe Experience",
    cards: [
      {
        tag: "Canción",
        title: "Tinta Triste",
        text: "Una canción sobre escribir aunque el mundo no escuche.",
        href: "/song/tinta-triste",
      },
      {
        tag: "Canción",
        title: "Oh Wow!",
        text: "Energía urbana para los guerreros que nunca se quitan.",
        href: "/song/oh-wow",
      },
      {
        tag: "Canción",
        title: "Historia de Amor",
        text: "Lluvia, Nueva York, nostalgia y una historia íntima.",
        href: "/song/historia-de-amor",
      },
      {
        tag: "Podcast",
        title: "Felencho Mundial",
        text: "IA, música, cultura, tecnología y despertar humano.",
        href: "/podcast",
      },
    ] as Card[],
  },

  EN: {
    flag: "🇺🇸",
    name: "English",
    title: "I Am",
    subtitle: "Music. Podcast. History. Artificial Intelligence. Caribbean. Future.",
    enter: "Enter",
    videos: "Videos",
    podcast: "Podcast",
    soundOff: "Sound",
    soundOn: "Sound On",
    universe: "Universe Experience",
    cards: [
      {
        tag: "Song",
        title: "Sad Ink",
        text: "A song about writing even when the world does not listen.",
        href: "/song/tinta-triste",
      },
      {
        tag: "Song",
        title: "Oh Wow!",
        text: "Urban energy for warriors who never give up.",
        href: "/song/oh-wow",
      },
      {
        tag: "Song",
        title: "Love Story",
        text: "Rain, New York, nostalgia, and an intimate story.",
        href: "/song/historia-de-amor",
      },
      {
        tag: "Podcast",
        title: "Felencho Worldwide",
        text: "AI, music, culture, technology, and human awakening.",
        href: "/podcast",
      },
    ] as Card[],
  },
};

type LanguageKey = keyof typeof languages;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [soundOn, setSoundOn] = useState(false);
  const [language, setLanguage] = useState<LanguageKey>("ES");
  const [videoReady, setVideoReady] = useState(false);

  const t = languages[language];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    video
      .play()
      .then(() => setVideoReady(true))
      .catch(() => setVideoReady(false));
  }, []);

  const toggleSound = async () => {
    if (!videoRef.current) return;

    try {
      await videoRef.current.play();
      setVideoReady(true);
    } catch {
      setVideoReady(false);
    }

    videoRef.current.muted = soundOn;
    videoRef.current.volume = soundOn ? 0 : 0.6;

    setSoundOn(!soundOn);
  };

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[url('/videos/felencho-poster.jpg')] bg-cover bg-center opacity-70" />

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/videos/felencho-poster.jpg"
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${
          videoReady ? "opacity-70" : "opacity-0"
        }`}
      >
        <source src="/videos/times-square-rain.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.10),transparent_55%)]" />

      <header className="absolute left-0 top-0 z-30 flex w-full items-start justify-between gap-3 p-4 md:p-8">
        <div>
          <h1 className="text-xl font-black tracking-[0.32em] text-cyan-400 drop-shadow-[0_0_18px_cyan] sm:text-2xl md:text-3xl">
            FELENCHO
          </h1>

          <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-gray-200 sm:text-xs md:text-sm">
            {t.universe}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageKey)}
            className="max-w-[180px] rounded-full border border-white/20 bg-black/65 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xl outline-none sm:max-w-none sm:px-4 sm:text-xs"
          >
            {Object.entries(languages).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {key} · {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSound}
            className="rounded-full border border-cyan-400/60 bg-black/55 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black sm:px-5 sm:text-xs"
          >
            {soundOn ? t.soundOn : t.soundOff}
          </button>
        </div>
      </header>

      <nav className="fixed left-1/2 top-24 z-[999999] flex -translate-x-1/2 gap-2 rounded-full border border-cyan-400/50 bg-black/80 p-2 shadow-[0_0_35px_rgba(0,255,255,0.35)] backdrop-blur-xl">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-full bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-cyan-400 hover:text-black"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-[230px] pt-36 text-center sm:pb-56 md:pb-44">
        <motion.h2
          initial={{ opacity: 0, y: 55 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="max-w-6xl text-[48px] font-black uppercase leading-[0.95] sm:text-6xl md:text-8xl"
        >
          {t.title}{" "}
          <span className="text-cyan-400 drop-shadow-[0_0_30px_cyan]">
            Felencho
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-5 max-w-3xl text-base leading-relaxed text-gray-100 sm:text-xl md:text-2xl"
        >
          {t.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/song/tinta-triste"
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:text-xs"
          >
            {t.enter}
          </Link>

          <Link
            href="/song/oh-wow"
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:text-xs"
          >
            {t.videos}
          </Link>

          <Link
            href="/podcast"
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:text-xs"
          >
            {t.podcast}
          </Link>
        </motion.div>
      </section>

      <section className="absolute bottom-0 left-0 z-30 w-full pb-6">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-4 md:gap-4 md:px-6">
          {t.cards.map((card, index) => (
            <Link
              key={`${card.title}-${index}`}
              href={card.href}
              className="min-w-[235px] snap-center rounded-2xl border border-white/15 bg-black/55 p-4 backdrop-blur-xl transition hover:scale-[1.02] hover:border-cyan-400 md:min-w-0 md:rounded-3xl md:p-5"
            >
              <p
                className={`text-[10px] uppercase tracking-[0.35em] ${
                  index === 0
                    ? "text-cyan-400"
                    : index === 1
                    ? "text-green-400"
                    : index === 2
                    ? "text-purple-400"
                    : "text-yellow-300"
                }`}
              >
                {card.tag}
              </p>

              <h3 className="mt-2 text-xl font-black leading-tight md:text-2xl">
                {card.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-gray-300 md:text-sm">
                {card.text}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}