"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

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
    soundOn: "Sonido Activo",
    universe: "Universe Experience",
    cards: [
      [
        "Álbum 01",
        "Yo Soy Felencho",
        "Bachatón urbano futurista con energía cyberpunk caribeña.",
      ],
      [
        "Álbum 02",
        "Freedom Island",
        "Reggae atmosférico con vibras tropicales y libertad espiritual.",
      ],
      [
        "Podcast",
        "Felencho Mundial",
        "IA, música, cultura, tecnología y despertar humano.",
      ],
      [
        "Historia",
        "Museo IA",
        "Alan Turing, evolución tecnológica, personajes y memoria digital.",
      ],
    ],
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
      ["Album 01", "I Am Felencho", "Futuristic urban bachatón with Caribbean cyberpunk energy."],
      ["Album 02", "Freedom Island", "Atmospheric reggae with tropical vibes and spiritual freedom."],
      ["Podcast", "Felencho Worldwide", "AI, music, culture, technology, and human awakening."],
      ["History", "AI Museum", "Alan Turing, technological evolution, characters, and digital memory."],
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
      ["专辑 01", "我是 Felencho", "充满加勒比赛博朋克能量的未来都市Bachatón。"],
      ["专辑 02", "Freedom Island", "带有热带氛围与精神自由感的氛围雷鬼。"],
      ["播客", "Felencho 世界", "人工智能、音乐、文化、技术与人类觉醒。"],
      ["历史", "人工智能博物馆", "艾伦·图灵、技术进化、人物与数字记忆。"],
    ],
  },
  FR: {
    flag: "🇫🇷",
    name: "Français",
    title: "Je Suis",
    subtitle: "Musique. Podcast. Histoire. Intelligence artificielle. Caraïbes. Futur.",
    enter: "Entrer",
    videos: "Vidéos",
    podcast: "Podcast",
    soundOff: "Son",
    soundOn: "Son activé",
    universe: "Expérience Univers",
    cards: [
      ["Album 01", "Je Suis Felencho", "Bachatón urbain futuriste avec énergie cyberpunk caribéenne."],
      ["Album 02", "Freedom Island", "Reggae atmosphérique aux vibrations tropicales et liberté spirituelle."],
      ["Podcast", "Felencho Mondial", "IA, musique, culture, technologie et éveil humain."],
      ["Histoire", "Musée IA", "Alan Turing, évolution technologique, personnages et mémoire numérique."],
    ],
  },
  PT: {
    flag: "🇧🇷",
    name: "Português",
    title: "Eu Sou",
    subtitle: "Música. Podcast. História. Inteligência Artificial. Caribe. Futuro.",
    enter: "Entrar",
    videos: "Vídeos",
    podcast: "Podcast",
    soundOff: "Som",
    soundOn: "Som Ativo",
    universe: "Experiência Universo",
    cards: [
      ["Álbum 01", "Eu Sou Felencho", "Bachatón urbano futurista com energia cyberpunk caribenha."],
      ["Álbum 02", "Freedom Island", "Reggae atmosférico com vibrações tropicais e liberdade espiritual."],
      ["Podcast", "Felencho Mundial", "IA, música, cultura, tecnologia e despertar humano."],
      ["História", "Museu IA", "Alan Turing, evolução tecnológica, personagens e memória digital."],
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
      ["アルバム 01", "私は Felencho", "カリブのサイバーパンクエネルギーを持つ未来的な都市型バチャトン。"],
      ["アルバム 02", "Freedom Island", "南国の雰囲気と精神的自由を持つアトモスフェリック・レゲエ。"],
      ["ポッドキャスト", "Felencho ワールド", "AI、音楽、文化、技術、人間の目覚め。"],
      ["歴史", "AI ミュージアム", "アラン・チューリング、技術進化、登場人物、デジタル記憶。"],
    ],
  },
  HI: {
    flag: "🇮🇳",
    name: "हिन्दी",
    title: "मैं हूँ",
    subtitle: "संगीत। पॉडकास्ट। इतिहास। कृत्रिम बुद्धिमत्ता। कैरेबियन। भविष्य।",
    enter: "प्रवेश",
    videos: "वीडियो",
    podcast: "पॉडकास्ट",
    soundOff: "ध्वनि",
    soundOn: "ध्वनि चालू",
    universe: "यूनिवर्स अनुभव",
    cards: [
      ["एल्बम 01", "मैं हूँ Felencho", "कैरेबियन साइबरपंक ऊर्जा वाला भविष्यवादी अर्बन बाचातोन।"],
      ["एल्बम 02", "Freedom Island", "उष्णकटिबंधीय वाइब्स और आध्यात्मिक स्वतंत्रता वाला रेगे।"],
      ["पॉडकास्ट", "Felencho Mundial", "AI, संगीत, संस्कृति, तकनीक और मानव जागरण।"],
      ["इतिहास", "AI संग्रहालय", "Alan Turing, तकनीकी विकास, पात्र और डिजिटल स्मृति।"],
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
      ["الألبوم 01", "أنا Felencho", "باتشاتون حضري مستقبلي بطاقة كاريبية سايبربانك."],
      ["الألبوم 02", "Freedom Island", "ريغي جوي بنبضات استوائية وحرية روحية."],
      ["بودكاست", "Felencho العالمي", "ذكاء اصطناعي، موسيقى، ثقافة، تقنية ويقظة إنسانية."],
      ["تاريخ", "متحف الذكاء الاصطناعي", "آلان تورنغ، تطور التكنولوجيا، الشخصيات والذاكرة الرقمية."],
    ],
  },
};

type LanguageKey = keyof typeof languages;

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [language, setLanguage] = useState<LanguageKey>("ES");

  const t = languages[language];

  const toggleSound = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = soundOn;
    videoRef.current.volume = soundOn ? 0 : 0.65;
    setSoundOn(!soundOn);
  };

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
      >
        <source src="/videos/times-square-rain.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.12),transparent_55%)]" />

      <header className="absolute left-0 top-0 z-30 flex w-full items-start justify-between gap-3 p-4 sm:p-6 md:p-8">
        <motion.div initial={{ opacity: 0, y: -25 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-black tracking-[0.32em] text-cyan-400 drop-shadow-[0_0_18px_cyan] sm:text-2xl md:text-3xl">
            FELENCHO
          </h1>
          <p className="mt-2 max-w-[170px] text-[10px] uppercase tracking-[0.35em] text-gray-200 sm:max-w-none sm:text-xs md:text-sm">
            {t.universe}
          </p>
        </motion.div>

        <div className="flex flex-col items-end gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageKey)}
            className="max-w-[210px] rounded-full border border-white/20 bg-black/55 px-3 py-2 text-xs font-bold text-white backdrop-blur-xl outline-none sm:px-4"
          >
            {Object.entries(languages).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {key} · {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={toggleSound}
            className="rounded-full border border-cyan-400/60 bg-black/45 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 backdrop-blur-xl transition hover:bg-cyan-400 hover:text-black sm:text-xs"
          >
            {soundOn ? t.soundOn : t.soundOff}
          </button>
        </div>
      </header>

      <section className="relative z-20 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-48 pt-40 text-center sm:pb-52 md:pb-56">
        <motion.h2
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4 }}
          className="max-w-6xl text-5xl font-black uppercase leading-none sm:text-6xl md:text-8xl"
        >
          {t.title}{" "}
          <span className="text-cyan-400 drop-shadow-[0_0_35px_cyan]">
            Felencho
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-5 max-w-3xl text-base text-gray-100 drop-shadow-lg sm:text-xl md:text-2xl"
        >
          {t.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-8 grid w-full max-w-[420px] grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-3 sm:gap-5"
        >
          {[t.enter, t.videos, t.podcast].map((item) => (
            <button
              key={item}
              className="rounded-full border border-cyan-400/50 bg-black/35 px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400 hover:text-black sm:py-4 sm:text-sm"
            >
              {item}
            </button>
          ))}
        </motion.div>
      </section>

      <section className="absolute bottom-0 left-0 z-30 w-full pb-5">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
          {t.cards.map((card, index) => (
            <motion.div
              key={card[1]}
              whileHover={{ scale: 1.03 }}
              className="min-w-[265px] snap-center rounded-3xl border border-white/15 bg-black/45 p-4 backdrop-blur-xl sm:min-w-[300px] sm:p-5 md:min-w-0 md:flex-1"
            >
              <p
                className={`text-[10px] uppercase tracking-[0.35em] sm:text-xs ${
                  index === 0
                    ? "text-cyan-400"
                    : index === 1
                    ? "text-green-400"
                    : index === 2
                    ? "text-purple-400"
                    : "text-yellow-300"
                }`}
              >
                {card[0]}
              </p>

              <h3 className="mt-2 text-xl font-black sm:text-2xl md:text-3xl">
                {card[1]}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-gray-300 sm:text-sm md:text-base">
                {card[2]}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}