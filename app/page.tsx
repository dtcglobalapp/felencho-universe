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

type LanguageContent = {
  flag: string;
  name: string;
  title: string;
  subtitle: string;
  enter: string;
  videos: string;
  podcast: string;
  soundOff: string;
  soundOn: string;
  universe: string;
  cards: Card[];
};

const languages = {
  ES: {
    flag: "🇪🇸",
    name: "Español",
    title: "Yo Soy",
    subtitle:
      "Música. Podcast. Historia. Inteligencia Artificial. Caribe. Futuro.",
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
        href: "/song/tinta-triste",
      },
    ],
  },

  EN: {
    flag: "🇺🇸",
    name: "English",
    title: "I Am",
    subtitle:
      "Music. Podcast. History. Artificial Intelligence. Caribbean. Future.",
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
        href: "/song/tinta-triste",
      },
    ],
  },

  ZH: {
    flag: "🇨🇳",
    name: "中文",
    title: "我是",
    subtitle: "音乐。播客。历史。人工智能。加勒比。未来。",
    enter: "进入",
    videos: "视频",
    podcast: "播客",
    soundOff: "声音",
    soundOn: "声音开启",
    universe: "宇宙体验",
    cards: [
      {
        tag: "歌曲",
        title: "悲伤的墨水",
        text: "即使世界不聆听，也继续书写的歌曲。",
        href: "/song/tinta-triste",
      },
      {
        tag: "歌曲",
        title: "Oh Wow!",
        text: "献给永不放弃的战士的城市能量。",
        href: "/song/oh-wow",
      },
      {
        tag: "歌曲",
        title: "爱情故事",
        text: "雨、纽约、怀旧与亲密的故事。",
        href: "/song/historia-de-amor",
      },
      {
        tag: "播客",
        title: "Felencho 世界",
        text: "人工智能、音乐、文化、技术与人类觉醒。",
        href: "/song/tinta-triste",
      },
    ],
  },

  FR: {
    flag: "🇫🇷",
    name: "Français",
    title: "Je Suis",
    subtitle:
      "Musique. Podcast. Histoire. Intelligence artificielle. Caraïbes. Futur.",
    enter: "Entrer",
    videos: "Vidéos",
    podcast: "Podcast",
    soundOff: "Son",
    soundOn: "Son activé",
    universe: "Expérience Univers",
    cards: [
      {
        tag: "Chanson",
        title: "Encre Triste",
        text: "Une chanson sur l’écriture même quand le monde n’écoute pas.",
        href: "/song/tinta-triste",
      },
      {
        tag: "Chanson",
        title: "Oh Wow!",
        text: "Énergie urbaine pour les guerriers qui n’abandonnent jamais.",
        href: "/song/oh-wow",
      },
      {
        tag: "Chanson",
        title: "Histoire d’Amour",
        text: "Pluie, New York, nostalgie et une histoire intime.",
        href: "/song/historia-de-amor",
      },
      {
        tag: "Podcast",
        title: "Felencho Mondial",
        text: "IA, musique, culture, technologie et éveil humain.",
        href: "/song/tinta-triste",
      },
    ],
  },

  PT: {
    flag: "🇧🇷",
    name: "Português",
    title: "Eu Sou",
    subtitle:
      "Música. Podcast. História. Inteligência Artificial. Caribe. Futuro.",
    enter: "Entrar",
    videos: "Vídeos",
    podcast: "Podcast",
    soundOff: "Som",
    soundOn: "Som ativo",
    universe: "Experiência Universo",
    cards: [
      {
        tag: "Canção",
        title: "Tinta Triste",
        text: "Uma canção sobre escrever mesmo quando o mundo não escuta.",
        href: "/song/tinta-triste",
      },
      {
        tag: "Canção",
        title: "Oh Wow!",
        text: "Energia urbana para guerreiros que nunca desistem.",
        href: "/song/oh-wow",
      },
      {
        tag: "Canção",
        title: "História de Amor",
        text: "Chuva, Nova York, nostalgia e uma história íntima.",
        href: "/song/historia-de-amor",
      },
      {
        tag: "Podcast",
        title: "Felencho Mundial",
        text: "IA, música, cultura, tecnologia e despertar humano.",
        href: "/song/tinta-triste",
      },
    ],
  },

  JA: {
    flag: "🇯🇵",
    name: "日本語",
    title: "私は",
    subtitle: "音楽。ポッドキャスト。歴史。人工知能。カリブ。未来。",
    enter: "入る",
    videos: "動画",
    podcast: "ポッドキャスト",
    soundOff: "音声",
    soundOn: "音声オン",
    universe: "宇宙体験",
    cards: [
      {
        tag: "曲",
        title: "悲しいインク",
        text: "世界が聞いてくれなくても書き続ける歌。",
        href: "/song/tinta-triste",
      },
      {
        tag: "曲",
        title: "Oh Wow!",
        text: "決して諦めない戦士たちへの都会的なエネルギー。",
        href: "/song/oh-wow",
      },
      {
        tag: "曲",
        title: "愛の物語",
        text: "雨、ニューヨーク、郷愁、そして親密な物語。",
        href: "/song/historia-de-amor",
      },
      {
        tag: "ポッドキャスト",
        title: "Felencho ワールド",
        text: "AI、音楽、文化、技術、人間の目覚め。",
        href: "/song/tinta-triste",
      },
    ],
  },

  HI: {
    flag: "🇮🇳",
    name: "हिन्दी",
    title: "मैं हूँ",
    subtitle:
      "संगीत। पॉडकास्ट। इतिहास। कृत्रिम बुद्धिमत्ता। कैरेबियन। भविष्य।",
    enter: "प्रवेश",
    videos: "वीडियो",
    podcast: "पॉडकास्ट",
    soundOff: "ध्वनि",
    soundOn: "ध्वनि चालू",
    universe: "यूनिवर्स अनुभव",
    cards: [
      {
        tag: "गीत",
        title: "उदास स्याही",
        text: "दुनिया न सुने फिर भी लिखते रहने की कहानी।",
        href: "/song/tinta-triste",
      },
      {
        tag: "गीत",
        title: "Oh Wow!",
        text: "उन योद्धाओं के लिए ऊर्जा जो कभी हार नहीं मानते।",
        href: "/song/oh-wow",
      },
      {
        tag: "गीत",
        title: "प्रेम कहानी",
        text: "बारिश, न्यूयॉर्क, यादें और एक गहरी कहानी।",
        href: "/song/historia-de-amor",
      },
      {
        tag: "पॉडकास्ट",
        title: "Felencho Mundial",
        text: "AI, संगीत, संस्कृति, तकनीक और मानव जागरण।",
        href: "/song/tinta-triste",
      },
    ],
  },

  AR: {
    flag: "🇸🇦",
    name: "العربية",
    title: "أنا",
    subtitle: "موسيقى. بودكاست. تاريخ. ذكاء اصطناعي. كاريبي. مستقبل.",
    enter: "دخول",
    videos: "فيديوهات",
    podcast: "بودكاست",
    soundOff: "الصوت",
    soundOn: "الصوت مفعل",
    universe: "تجربة الكون",
    cards: [
      {
        tag: "أغنية",
        title: "حبر حزين",
        text: "أغنية عن الكتابة حتى عندما لا يصغي العالم.",
        href: "/song/tinta-triste",
      },
      {
        tag: "أغنية",
        title: "Oh Wow!",
        text: "طاقة حضرية للمحاربين الذين لا يستسلمون.",
        href: "/song/oh-wow",
      },
      {
        tag: "أغنية",
        title: "قصة حب",
        text: "مطر، نيويورك، حنين وقصة حميمة.",
        href: "/song/historia-de-amor",
      },
      {
        tag: "بودكاست",
        title: "Felencho العالمي",
        text: "ذكاء اصطناعي، موسيقى، ثقافة، تقنية ويقظة إنسانية.",
        href: "/song/tinta-triste",
      },
    ],
  },
} satisfies Record<string, LanguageContent>;

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

    const startVideo = async () => {
      try {
        await video.play();
        setVideoReady(true);
      } catch {
        setVideoReady(false);
      }
    };

    startVideo();
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-black tracking-[0.32em] text-cyan-400 drop-shadow-[0_0_18px_cyan] sm:text-2xl md:text-3xl">
            FELENCHO
          </h1>

          <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-gray-200 sm:text-xs md:text-sm">
            {t.universe}
          </p>
        </motion.div>

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

      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-[230px] pt-28 text-center sm:pb-56 md:pb-44">
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
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:py-3 sm:text-xs md:px-10"
          >
            {t.enter}
          </Link>

          <Link
            href="/song/oh-wow"
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:py-3 sm:text-xs md:px-10"
          >
            {t.videos}
          </Link>

          <Link
            href="/song/historia-de-amor"
            className="rounded-full border border-cyan-400/45 bg-black/35 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:px-8 sm:py-3 sm:text-xs md:px-10"
          >
            {t.podcast}
          </Link>
        </motion.div>
      </section>

      <section className="absolute bottom-0 left-0 z-30 w-full pb-5">
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