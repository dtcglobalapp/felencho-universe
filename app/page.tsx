import type {
  Metadata,
} from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Felencho | Under Construction",
  description:
    "The next generation of Felencho Digital Actors is under construction.",
};

export default function MaintenancePage() {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-black px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.09),transparent_42%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <Image
          src="/brand/lion/lion-icon.png"
          alt="Felencho"
          width={180}
          height={180}
          priority
          className="h-24 w-24 object-contain sm:h-28 sm:w-28"
        />

        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/80 sm:text-sm">
          FELENCHO
        </p>

        <h1 className="mt-8 text-balance text-3xl font-light leading-tight tracking-[-0.025em] text-white sm:text-5xl">
          Our next generation of Digital
          Actors is under construction.
        </h1>

        <div className="my-10 h-px w-20 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <p className="text-base leading-7 text-white/50 sm:text-lg">
          Felencho Studio is currently in
          development.
        </p>

        <p className="mt-3 text-sm uppercase tracking-[0.22em] text-white/30">
          We&apos;ll be back soon.
        </p>

        <Link
          href="/felencho-studio/auth?next=%2Ffelencho-studio%2Fdashboard"
          className="mt-12 rounded-full border border-white/15 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-white/45 transition hover:border-cyan-300/50 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        >
          Studio Login
        </Link>
      </section>
    </main>
  );
}
