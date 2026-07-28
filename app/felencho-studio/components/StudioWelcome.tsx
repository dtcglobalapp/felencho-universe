"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  FELENCHO_STUDIO,
  FELENCHO_STUDIO_VERSION_LABEL,
} from "../../avatar-engine/config/GenesisConfig";
import MediaCapture from "./MediaCapture";

import type {
  CapturedMedia,
} from "./MediaCapture";

const CREATION_TYPES = [
  {
    id: "digital-professional",
    label: "Digital Professional",
    description:
      "Share knowledge, services, and expertise.",
  },
  {
    id: "digital-actor",
    label: "Digital Actor",
    description:
      "Perform stories, scripts, and productions.",
  },
  {
    id: "virtual-influencer",
    label: "Virtual Influencer",
    description:
      "Create a consistent digital presence.",
  },
  {
    id: "educational-character",
    label: "Educational Character",
    description:
      "Teach and guide learners naturally.",
  },
  {
    id: "story-character",
    label: "Story Character",
    description:
      "Bring an original character to life.",
  },
  {
    id: "animated-character",
    label: "Animated Character",
    description:
      "Create an expressive visual personality.",
  },
  {
    id: "business-assistant",
    label: "Business Assistant",
    description:
      "Help customers understand your business.",
  },
] as const;

type CreationType =
  (typeof CREATION_TYPES)[number];

export default function StudioWelcome() {
  const [selectedType, setSelectedType] =
    useState<CreationType | null>(null);

  const [capturedMedia, setCapturedMedia] =
    useState<CapturedMedia | null>(null);

  function selectCreationType(
    creationType: CreationType,
  ) {
    setSelectedType(creationType);
    setCapturedMedia(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050708] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-14rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-violet-500/[0.08] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
          <Link
            href="/felencho-studio"
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-sm font-black text-cyan-200">
              F
            </span>

            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.14em]">
                {FELENCHO_STUDIO.name}
              </span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-white/35">
                Private Beta
              </span>
            </span>
          </Link>

          <Link
            href="/felencho-studio/advanced"
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/55 transition hover:border-cyan-200/35 hover:text-cyan-100"
          >
            Advanced Mode
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-14 px-5 py-12 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:py-20">
        <section className="lg:pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
            An intelligent creative assistant
          </p>

          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Create who your ideas need.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/55 sm:text-lg">
            {FELENCHO_STUDIO.tagline}
          </p>

          <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 text-center text-xs text-white/40">
            <PromiseCard
              value="1"
              label="Simple conversation"
            />
            <PromiseCard
              value="2"
              label="Photo or short video"
            />
            <PromiseCard
              value="3"
              label="You stay in control"
            />
          </div>

          <p className="mt-8 max-w-lg text-xs leading-5 text-white/30">
            Automatic analysis, guided interviews,
            and digital-professional generation are
            planned capabilities. Phase 1 introduces
            the protected product foundation without
            simulating AI work that is not yet
            available.
          </p>
        </section>

        <section
          aria-label="Felencho Studio conversation"
          className="rounded-[2rem] border border-white/10 bg-[#0a0f12]/95 p-4 shadow-2xl shadow-black/40 sm:p-6"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.07] pb-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-200 to-violet-300 font-bold text-[#071014]">
              AI
            </span>

            <div>
              <h2 className="text-sm font-semibold">
                Felencho Studio Assistant
              </h2>
              <p className="mt-0.5 text-xs text-emerald-300/70">
                Ready to begin
              </p>
            </div>
          </div>

          <div
            aria-live="polite"
            className="mt-6 space-y-5"
          >
            <AssistantMessage>
              <p>Hello. Welcome to Felencho Studio.</p>
              <p className="mt-2">
                What would you like to create
                today?
              </p>
            </AssistantMessage>

            {!selectedType ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {CREATION_TYPES.map(
                  (creationType) => (
                    <button
                      key={creationType.id}
                      type="button"
                      onClick={() =>
                        selectCreationType(
                          creationType,
                        )
                      }
                      className="group rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.07]"
                    >
                      <span className="block text-sm font-semibold transition group-hover:text-cyan-100">
                        {creationType.label}
                      </span>
                      <span className="mt-1.5 block text-xs leading-5 text-white/40">
                        {
                          creationType.description
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#04212a]">
                    I want to create a{" "}
                    {selectedType.label}.
                  </div>
                </div>

                <AssistantMessage>
                  <p>
                    Wonderful. I&apos;ll help you
                    create your{" "}
                    {selectedType.label}.
                  </p>
                  <p className="mt-2">
                    To begin, upload one photo or
                    record a short video. No manual
                    preparation is required.
                  </p>
                </AssistantMessage>

                <MediaCapture
                  onMediaReady={
                    setCapturedMedia
                  }
                />

                {capturedMedia ? (
                  <AssistantMessage>
                    <p>
                      Your{" "}
                      {capturedMedia.kind} is ready
                      on this device.
                    </p>
                    <p className="mt-2 text-white/55">
                      Automatic quality analysis and
                      the conversational discovery
                      interview are not enabled in
                      Phase 1. When available, I will
                      guide you through them here
                      instead of exposing technical
                      configuration.
                    </p>
                  </AssistantMessage>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(null);
                    setCapturedMedia(null);
                  }}
                  className="text-left text-xs font-semibold text-white/35 transition hover:text-white/70"
                >
                  ← Choose a different direction
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-white/[0.07] px-5 py-6 text-center text-[10px] uppercase tracking-[0.2em] text-white/25">
        {FELENCHO_STUDIO_VERSION_LABEL}
      </footer>
    </main>
  );
}

function AssistantMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] font-bold text-cyan-200">
        AI
      </span>

      <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/80">
        {children}
      </div>
    </div>
  );
}

function PromiseCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-2 py-4">
      <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-cyan-300/10 font-semibold text-cyan-200">
        {value}
      </span>
      <span className="mt-2 block leading-4">
        {label}
      </span>
    </div>
  );
}
