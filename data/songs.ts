export type LanguageKey = "es" | "en" | "fr" | "pt" | "ja" | "zh" | "hi" | "ar";

export type Song = {
  slug: string;
  title: Record<LanguageKey, string>;
  composer: string;
  album: string;
  mood: string;
  video: string;
  poster: string;
  story: Record<LanguageKey, string>;
  lyrics: {
    time: number;
    lines: Record<LanguageKey, string>;
  }[];
};

export const songs: Song[] = [
  {
    slug: "tinta-triste",
    title: {
      es: "Tinta Triste",
      en: "Sad Ink",
      fr: "Encre Triste",
      pt: "Tinta Triste",
      ja: "悲しいインク",
      zh: "悲伤的墨水",
      hi: "उदास स्याही",
      ar: "حبر حزين",
    },
    composer: "Felencho",
    album: "Yo Soy Felencho",
    mood: "Poética, íntima, nocturna",
    video: "/videos/tinta-triste.mp4",
    poster: "/videos/felencho-poster.jpg",
    story: {
      es: "Una canción sobre escribir aunque el mundo no escuche. La tinta se convierte en refugio, memoria y sanación.",
      en: "A song about writing even when the world does not listen. Ink becomes shelter, memory, and healing.",
      fr: "Une chanson sur l’acte d’écrire même quand le monde n’écoute pas.",
      pt: "Uma canção sobre escrever mesmo quando o mundo não escuta.",
      ja: "世界が聞いてくれなくても書き続けることについての歌。",
      zh: "一首关于即使世界不聆听也继续书写的歌曲。",
      hi: "दुनिया न सुने फिर भी लिखते रहने की एक गीतात्मक कहानी।",
      ar: "أغنية عن الكتابة حتى عندما لا يصغي العالم.",
    },
    lyrics: [
      {
        time: 0,
        lines: {
          es: "A veces me pregunto, ¿para qué escribir?",
          en: "Sometimes I ask myself, why write at all?",
          fr: "Parfois je me demande, pourquoi écrire ?",
          pt: "Às vezes me pergunto, para que escrever?",
          ja: "時々、自分に問いかける。なぜ書くのか。",
          zh: "有时我问自己，为什么还要写？",
          hi: "कभी-कभी मैं सोचता हूँ, लिखने का क्या मतलब?",
          ar: "أحيانًا أسأل نفسي، لماذا أكتب؟",
        },
      },
      {
        time: 8,
        lines: {
          es: "Si el mundo sigue girando y nadie quiere oír.",
          en: "If the world keeps turning and no one wants to hear.",
          fr: "Si le monde continue de tourner et que personne ne veut écouter.",
          pt: "Se o mundo continua girando e ninguém quer ouvir.",
          ja: "世界は回り続け、誰も聞こうとしないのに。",
          zh: "如果世界仍在转动，却没人愿意聆听。",
          hi: "जब दुनिया चलती रहती है और कोई सुनना नहीं चाहता।",
          ar: "إن كان العالم يدور ولا أحد يريد أن يسمع.",
        },
      },
      {
        time: 18,
        lines: {
          es: "He pensado detenerme, guardar la pluma y callar.",
          en: "I have thought about stopping, putting the pen away and staying silent.",
          fr: "J’ai pensé m’arrêter, ranger la plume et me taire.",
          pt: "Já pensei em parar, guardar a caneta e calar.",
          ja: "やめようと思った。ペンを置いて黙ろうと。",
          zh: "我曾想停下来，把笔收起，保持沉默。",
          hi: "मैंने रुकने की सोची, कलम रख देने और चुप हो जाने की।",
          ar: "فكرت أن أتوقف، أن أضع القلم وأصمت.",
        },
      },
      {
        time: 28,
        lines: {
          es: "Pero el alma se me rompe si no la dejo hablar.",
          en: "But my soul breaks if I do not let it speak.",
          fr: "Mais mon âme se brise si je ne la laisse pas parler.",
          pt: "Mas minha alma se quebra se eu não a deixo falar.",
          ja: "でも語らせなければ、魂が壊れてしまう。",
          zh: "但若不让灵魂说话，它就会碎裂。",
          hi: "पर आत्मा टूट जाती है अगर मैं उसे बोलने न दूँ।",
          ar: "لكن روحي تنكسر إن لم أتركها تتكلم.",
        },
      },
    ],
  },
  {
    slug: "oh-wow",
    title: {
      es: "Oh Wow!",
      en: "Oh Wow!",
      fr: "Oh Wow!",
      pt: "Oh Wow!",
      ja: "Oh Wow!",
      zh: "Oh Wow!",
      hi: "Oh Wow!",
      ar: "Oh Wow!",
    },
    composer: "Felencho",
    album: "Yo Soy Felencho",
    mood: "Guerrero, urbano, energético",
    video: "/videos/oh-wow.mp4",
    poster: "/videos/felencho-poster.jpg",
    story: {
      es: "Una respuesta de fuerza para quienes dudaron, se burlaron o intentaron apagar una voz creativa.",
      en: "A powerful response to those who doubted, mocked, or tried to silence a creative voice.",
      fr: "Une réponse puissante à ceux qui ont douté, moqué ou voulu éteindre une voix créative.",
      pt: "Uma resposta forte para quem duvidou, zombou ou tentou calar uma voz criativa.",
      ja: "疑い、嘲笑し、創造的な声を消そうとした者たちへの力強い答え。",
      zh: "对那些怀疑、嘲笑或试图压制创作声音的人作出的有力回应。",
      hi: "उन लोगों के लिए जवाब जिन्होंने शक किया, मजाक उड़ाया या रचनात्मक आवाज़ को दबाना चाहा।",
      ar: "رد قوي على من شككوا وسخروا وحاولوا إسكات صوت الإبداع.",
    },
    lyrics: [
      {
        time: 0,
        lines: {
          es: "Tu burla fue mi gasolina, me dolió.",
          en: "Your mockery became my fuel, it hurt me.",
          fr: "Ta moquerie est devenue mon carburant, elle m’a fait mal.",
          pt: "Tua zombaria virou minha gasolina, doeu.",
          ja: "君の嘲笑は僕の燃料になった。痛かった。",
          zh: "你的嘲笑成了我的燃料，虽然它让我疼痛。",
          hi: "तुम्हारा मजाक मेरी आग बन गया, दर्द हुआ।",
          ar: "سخريتك صارت وقودي، وقد آلمتني.",
        },
      },
      {
        time: 8,
        lines: {
          es: "Con Dios adelante nadie me ha vencío.",
          en: "With God ahead of me, no one has defeated me.",
          fr: "Avec Dieu devant moi, personne ne m’a vaincu.",
          pt: "Com Deus na frente, ninguém me venceu.",
          ja: "神が前にいれば、誰も僕を倒せない。",
          zh: "有上帝在前方，没人能击败我。",
          hi: "ईश्वर आगे हों तो किसी ने मुझे हराया नहीं।",
          ar: "ومع الله أمامي، لم يهزمني أحد.",
        },
      },
      {
        time: 16,
        lines: {
          es: "Mírame brillando.",
          en: "Look at me shining.",
          fr: "Regarde-moi briller.",
          pt: "Olha eu brilhando.",
          ja: "輝く僕を見て。",
          zh: "看着我闪耀。",
          hi: "मुझे चमकते हुए देखो।",
          ar: "انظر إليّ وأنا أتألق.",
        },
      },
    ],
  },
  {
    slug: "historia-de-amor",
    title: {
      es: "Historia de Amor",
      en: "Love Story",
      fr: "Histoire d’Amour",
      pt: "História de Amor",
      ja: "愛の物語",
      zh: "爱情故事",
      hi: "प्रेम कहानी",
      ar: "قصة حب",
    },
    composer: "Felencho",
    album: "Yo Soy Felencho",
    mood: "Romántica, lluvia, nostalgia de Nueva York",
    video: "/videos/historia-de-amor.mp4",
    poster: "/videos/felencho-poster.jpg",
    story: {
      es: "Una habitación vieja en Nueva York, lluvia contra la ventana y una historia íntima contada desde el silencio.",
      en: "An old room in New York, rain against the window, and an intimate story told through silence.",
      fr: "Une vieille chambre à New York, la pluie contre la fenêtre et une histoire intime racontée dans le silence.",
      pt: "Um quarto antigo em Nova York, chuva na janela e uma história íntima contada no silêncio.",
      ja: "ニューヨークの古い部屋、窓を打つ雨、沈黙の中で語られる親密な物語。",
      zh: "纽约的一间旧房间，雨打在窗上，一个在沉默中讲述的亲密故事。",
      hi: "न्यूयॉर्क का पुराना कमरा, खिड़की पर बारिश, और खामोशी में कही गई प्रेम कहानी।",
      ar: "غرفة قديمة في نيويورك، المطر على النافذة، وقصة حميمة يرويها الصمت.",
    },
    lyrics: [
      {
        time: 0,
        lines: {
          es: "La lluvia toca la ventana.",
          en: "The rain touches the window.",
          fr: "La pluie touche la fenêtre.",
          pt: "A chuva toca a janela.",
          ja: "雨が窓に触れる。",
          zh: "雨轻敲着窗户。",
          hi: "बारिश खिड़की को छूती है।",
          ar: "المطر يلامس النافذة.",
        },
      },
      {
        time: 8,
        lines: {
          es: "Y la ciudad guarda nuestro amor.",
          en: "And the city keeps our love.",
          fr: "Et la ville garde notre amour.",
          pt: "E a cidade guarda nosso amor.",
          ja: "そして街は僕たちの愛を守る。",
          zh: "城市收藏着我们的爱。",
          hi: "और शहर हमारे प्यार को संभालता है।",
          ar: "والمدينة تحفظ حبنا.",
        },
      },
    ],
  },
];

export function getSongBySlug(slug: string) {
  return songs.find((song) => song.slug === slug);
}