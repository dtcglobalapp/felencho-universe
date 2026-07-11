"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AVATAR_STATE_LABELS,
  AVATAR_STATES,
  type AvatarState,
} from "@/avatar-engine/contracts/avatar-states";
import type {
  AvatarEmotion,
  AvatarEngineEvent,
  AvatarViseme,
} from "@/avatar-engine/contracts/avatar-events";
import { bobConfig } from "@/avatar-engine/characters/bob.config";
import { avatarEventBus } from "@/avatar-engine/runtime/AvatarEventBus";
import { AvatarRuntime } from "@/avatar-engine/runtime/AvatarRuntime";

const EMOTIONS: AvatarEmotion[] = [
  "neutral",
  "happy",
  "serious",
  "concerned",
  "surprised",
  "thinking",
  "amused",
  "sad",
  "inspired",
];

const VISEMES: AvatarViseme[] = [
  "REST",
  "A",
  "E",
  "I",
  "O",
  "U",
  "M",
  "F",
  "L",
  "S",
];

type BobAvatarProps = {
  diagnostics?: boolean;
};

export default function BobAvatar({
  diagnostics = false,
}: BobAvatarProps) {
  const runtime = useMemo(
    () => new AvatarRuntime(bobConfig),
    []
  );

  const speakingTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const [state, setState] =
    useState<AvatarState>(
      runtime.getState()
    );

  const [emotion, setEmotion] =
    useState<AvatarEmotion>(
      runtime.getEmotion()
    );

  const [viseme, setViseme] =
    useState<AvatarViseme>(
      runtime.getViseme()
    );

  const [audioLevel, setAudioLevel] =
    useState(0);

  const [blink, setBlink] =
    useState(false);

  const [events, setEvents] = useState<
    AvatarEngineEvent[]
  >([]);

  useEffect(() => {
    const unsubscribe =
      avatarEventBus.subscribe((event) => {
        if (event.character !== "bob") {
          return;
        }

        setEvents((previous) => [
          event,
          ...previous,
        ].slice(0, 20));

        if (
          event.type ===
          "avatar.state.change"
        ) {
          setState(event.state);
        }

        if (
          event.type ===
          "avatar.emotion.change"
        ) {
          setEmotion(event.emotion);
        }

        if (
          event.type ===
          "avatar.viseme.change"
        ) {
          setViseme(event.viseme);
        }

        if (
          event.type ===
          "avatar.audio.level"
        ) {
          setAudioLevel(event.level);
        }

        if (
          event.type === "avatar.blink"
        ) {
          setBlink(true);

          window.setTimeout(() => {
            setBlink(false);
          }, 180);
        }

        if (
          event.type === "avatar.reset"
        ) {
          setState(
            bobConfig.initialState
          );
          setEmotion(
            bobConfig.initialEmotion
          );
          setViseme(
            bobConfig.initialViseme
          );
          setAudioLevel(0);
        }
      });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleBlink() {
      const delay =
        bobConfig.motion.blinkMinMs +
        Math.random() *
          (bobConfig.motion.blinkMaxMs -
            bobConfig.motion.blinkMinMs);

      timeoutId = window.setTimeout(() => {
        runtime.blink();
        scheduleBlink();
      }, delay);
    }

    scheduleBlink();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [runtime]);

  useEffect(() => {
    if (state === "speaking") {
      if (!speakingTimerRef.current) {
        speakingTimerRef.current =
          setInterval(() => {
            const level =
              0.25 + Math.random() * 0.75;

            const randomViseme =
              VISEMES[
                1 +
                  Math.floor(
                    Math.random() *
                      (VISEMES.length - 1)
                  )
              ];

            runtime.setAudioLevel(level);
            runtime.setViseme(
              randomViseme,
              level
            );
          }, 115);
      }
    } else {
      if (speakingTimerRef.current) {
        clearInterval(
          speakingTimerRef.current
        );

        speakingTimerRef.current = null;
      }

      runtime.setAudioLevel(0);
      runtime.setViseme("REST", 0);
    }

    return () => {
      if (speakingTimerRef.current) {
        clearInterval(
          speakingTimerRef.current
        );

        speakingTimerRef.current = null;
      }
    };
  }, [runtime, state]);

  function changeState(
    nextState: AvatarState
  ) {
    try {
      runtime.setState(nextState);
    } catch {
      runtime.setState(nextState, true);
    }
  }

  function runDemo() {
    const sequence: Array<{
      state: AvatarState;
      delay: number;
    }> = [
      {
        state: "waking",
        delay: 0,
      },
      {
        state: "listening",
        delay: 1400,
      },
      {
        state: "thinking",
        delay: 3600,
      },
      {
        state: "speaking",
        delay: 5600,
      },
      {
        state: "listening",
        delay: 10200,
      },
      {
        state:
          "returning_to_presence",
        delay: 12500,
      },
      {
        state: "sleeping",
        delay: 14200,
      },
    ];

    for (const item of sequence) {
      window.setTimeout(() => {
        runtime.setState(
          item.state,
          true
        );
      }, item.delay);
    }
  }

  const mouthScale =
    state === "speaking"
      ? 0.25 + audioLevel * 0.9
      : 0.12;

  const breathingEnabled =
    state !== "sleeping";

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        overflow: "hidden",
        background:
          bobConfig.colors.background,
        color: bobConfig.colors.text,
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          transform:
            breathingEnabled
              ? "scale(1.008)"
              : "scale(1)",
          animation:
            breathingEnabled
              ? `bobBreathing ${bobConfig.motion.breathingDurationMs}ms ease-in-out infinite`
              : "none",
        }}
      >
        <video
          src={
            bobConfig.presenceVideo
          }
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              state === "sleeping"
                ? "brightness(.65) saturate(.75)"
                : emotion === "serious"
                  ? "contrast(1.08) saturate(.9)"
                  : emotion === "happy"
                    ? "brightness(1.08) saturate(1.12)"
                    : "none",
            transition:
              "filter 500ms ease",
          }}
        />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          width: "9%",
          height: `${Math.max(
            4,
            mouthScale * 12
          )}%`,
          minHeight: 8,
          borderRadius: "50%",
          background:
            "rgba(20, 0, 0, .56)",
          border:
            "1px solid rgba(255,255,255,.13)",
          transform:
            "translate(-50%, -50%)",
          opacity:
            state === "speaking"
              ? 0.68
              : 0,
          transition:
            "height 70ms linear, opacity 180ms ease",
          boxShadow:
            "0 0 16px rgba(0,0,0,.55)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "rgba(0,0,0,.88)",
          opacity: blink ? 0.72 : 0,
          transition:
            "opacity 60ms linear",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          zIndex: 20,
          border:
            "1px solid rgba(103,232,249,.4)",
          borderRadius: 14,
          background:
            "rgba(0,0,0,.78)",
          padding: "12px 15px",
          color:
            bobConfig.colors.primary,
          backdropFilter: "blur(10px)",
        }}
      >
        <strong>
          BOB — FELENCHO AVATAR ENGINE
        </strong>

        <span
          style={{
            marginLeft: 12,
          }}
        >
          {AVATAR_STATE_LABELS[state]}
        </span>

        <span
          style={{
            marginLeft: 12,
          }}
        >
          Emoción: {emotion}
        </span>

        <span
          style={{
            marginLeft: 12,
          }}
        >
          Visema: {viseme}
        </span>
      </div>

      {diagnostics && (
        <aside
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            zIndex: 30,
            width: 390,
            maxHeight:
              "calc(100vh - 36px)",
            overflow: "auto",
            border:
              "1px solid rgba(167,139,250,.42)",
            borderRadius: 16,
            background:
              "rgba(3,3,8,.9)",
            padding: 18,
            backdropFilter:
              "blur(12px)",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              fontSize: 20,
            }}
          >
            Bob FAE Diagnostics
          </h1>

          <button
            type="button"
            onClick={runDemo}
            style={buttonStyle}
          >
            Ejecutar demostración
          </button>

          <button
            type="button"
            onClick={() =>
              runtime.reset()
            }
            style={buttonStyle}
          >
            Reiniciar Bob
          </button>

          <h2 style={sectionTitleStyle}>
            Estados
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >
            {AVATAR_STATES.map(
              (avatarState) => (
                <button
                  key={avatarState}
                  type="button"
                  onClick={() =>
                    changeState(
                      avatarState
                    )
                  }
                  style={{
                    ...smallButtonStyle,
                    borderColor:
                      state ===
                      avatarState
                        ? bobConfig.colors
                            .primary
                        : "rgba(255,255,255,.15)",
                  }}
                >
                  {
                    AVATAR_STATE_LABELS[
                      avatarState
                    ]
                  }
                </button>
              )
            )}
          </div>

          <h2 style={sectionTitleStyle}>
            Emociones
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >
            {EMOTIONS.map(
              (avatarEmotion) => (
                <button
                  key={avatarEmotion}
                  type="button"
                  onClick={() =>
                    runtime.setEmotion(
                      avatarEmotion
                    )
                  }
                  style={{
                    ...smallButtonStyle,
                    borderColor:
                      emotion ===
                      avatarEmotion
                        ? bobConfig.colors
                            .secondary
                        : "rgba(255,255,255,.15)",
                  }}
                >
                  {avatarEmotion}
                </button>
              )
            )}
          </div>

          <h2 style={sectionTitleStyle}>
            Eventos recientes
          </h2>

          <div
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: "#d1d5db",
            }}
          >
            {events.length === 0 && (
              <div>
                Sin eventos todavía.
              </div>
            )}

            {events.map(
              (event, index) => (
                <div
                  key={`${event.timestamp}-${index}`}
                  style={{
                    borderBottom:
                      "1px solid rgba(255,255,255,.08)",
                    padding: "5px 0",
                  }}
                >
                  {new Date(
                    event.timestamp
                  ).toLocaleTimeString()}
                  {" · "}
                  {event.type}
                </div>
              )
            )}
          </div>
        </aside>
      )}

      <style jsx global>{`
        @keyframes bobBreathing {
          0% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.012);
          }

          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  marginBottom: 9,
  border:
    "1px solid rgba(103,232,249,.45)",
  borderRadius: 10,
  background:
    "rgba(8,18,24,.95)",
  color: "#67e8f9",
  fontWeight: 800,
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  minHeight: 38,
  border:
    "1px solid rgba(255,255,255,.15)",
  borderRadius: 8,
  background:
    "rgba(255,255,255,.045)",
  color: "#e5e7eb",
  cursor: "pointer",
};

const sectionTitleStyle: React.CSSProperties = {
  marginTop: 20,
  marginBottom: 10,
  fontSize: 14,
  color: "#c4b5fd",
};
