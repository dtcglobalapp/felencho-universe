import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Music", href: "/music" },
  { label: "Podcast", href: "/podcast" },
  { label: "Museum", href: "/museum" },
  { label: "Novels", href: "/novels" },
  { label: "About", href: "/about" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* VIDEO BACKGROUND */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/felencho-loop.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/55" />

      {/* TOP MENU */}
      <div className="fixed left-1/2 top-24 z-[999999] flex -translate-x-1/2 gap-2 rounded-full border border-cyan-400 bg-black/80 p-2 shadow-[0_0_35px_rgba(0,255,255,0.35)] backdrop-blur-xl">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-full bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-cyan-400 hover:text-black"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* LOGO */}
        <div className="absolute left-6 top-6 text-left">
          <h1 className="text-5xl font-black tracking-[0.25em] text-cyan-400">
            FELENCHO
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.35em] text-white/80">
            Universe Experience
          </p>
        </div>

        {/* LANGUAGE */}
        <div className="absolute right-6 top-6 flex items-center gap-3">
          <button className="rounded-full border border-white/20 bg-black/50 px-5 py-2 text-sm font-bold backdrop-blur-xl">
            🇪🇸 ES • Español
          </button>

          <button className="rounded-full border border-cyan-400 px-5 py-2 text-sm font-black tracking-[0.2em] text-cyan-400">
            SONIDO
          </button>
        </div>

        {/* TITLE */}
        <div className="max-w-5xl">
          <h2 className="text-6xl font-black uppercase leading-none md:text-8xl">
            YO SOY{" "}
            <span className="text-cyan-400">FELENCHO</span>
          </h2>

          <p className="mt-6 text-xl text-white/90 md:text-2xl">
            Música. Podcast. Historia. Inteligencia Artificial. Caribe.
            Futuro.
          </p>
        </div>

        {/* BUTTONS */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-full border border-cyan-400 bg-black/60 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-cyan-400 hover:text-black">
            Entrar
          </button>

          <button className="rounded-full border border-cyan-400 bg-black/60 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-cyan-400 hover:text-black">
            Videos
          </button>

          <button className="rounded-full border border-cyan-400 bg-black/60 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-cyan-400 hover:text-black">
            Podcast
          </button>
        </div>

        {/* CARDS */}
        <div className="mt-24 grid w-full max-w-7xl gap-5 md:grid-cols-4">
          <Link
            href="/song/tinta-triste"
            className="rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition hover:scale-[1.02]"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
              Canción
            </p>

            <h3 className="mt-4 text-4xl font-black">
              Tinta Triste
            </h3>

            <p className="mt-4 text-white/70">
              Una canción sobre escribir aunque el mundo no escuche.
            </p>
          </Link>

          <Link
            href="/song/oh-wow"
            className="rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition hover:scale-[1.02]"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-green-400">
              Canción
            </p>

            <h3 className="mt-4 text-4xl font-black">
              Oh Wow!
            </h3>

            <p className="mt-4 text-white/70">
              Energía urbana para los guerreros que nunca se quitan.
            </p>
          </Link>

          <Link
            href="/song/historia-de-amor"
            className="rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition hover:scale-[1.02]"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-400">
              Canción
            </p>

            <h3 className="mt-4 text-4xl font-black">
              Historia de Amor
            </h3>

            <p className="mt-4 text-white/70">
              Lluvia, Nueva York, nostalgia y una historia íntima.
            </p>
          </Link>

          <Link
            href="/podcast"
            className="rounded-[28px] border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition hover:scale-[1.02]"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-400">
              Podcast
            </p>

            <h3 className="mt-4 text-4xl font-black">
              Felencho Mundial
            </h3>

            <p className="mt-4 text-white/70">
              IA, música, cultura, tecnología y despertar humano.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}