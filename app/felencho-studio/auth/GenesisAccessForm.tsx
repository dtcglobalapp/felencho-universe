"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  FELENCHO_STUDIO,
} from "../../avatar-engine/config/GenesisConfig";

interface GenesisAccessFormProps {
  nextPath: string;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readResponseMessage(
  value: unknown,
): {
  error?: string;
  redirectTo?: string;
} {
  if (!isRecord(value)) {
    return {};
  }

  return {
    error:
      typeof value.error === "string"
        ? value.error
        : undefined,
    redirectTo:
      typeof value.redirectTo === "string"
        ? value.redirectTo
        : undefined,
  };
}

export default function GenesisAccessForm({
  nextPath,
}: GenesisAccessFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/studio/access",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            code,
            next: nextPath,
          }),
        },
      );

      const payload: unknown =
        await response.json();

      const result =
        readResponseMessage(payload);

      if (!response.ok) {
        setError(
          result.error ??
            "Access could not be verified.",
        );
        return;
      }

      window.location.assign(
        result.redirectTo ?? nextPath,
      );
    } catch {
      setError(
        "Access could not be verified. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050708] px-5 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-cyan-300/15 bg-[#0b1114] p-7 shadow-2xl shadow-cyan-950/30 sm:p-9">
          <Link
            href="/felencho-studio"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70 transition hover:text-cyan-100"
          >
            ← Back to Felencho Studio
          </Link>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Private Beta
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Authorized access
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/55">
              Advanced Mode is reserved for
              authorized owners, developers,
              artists, and internal collaborators.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                Authorized email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/50">
                Invitation key
              </span>
              <input
                required
                type="password"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-[#03202a] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-55"
            >
              {isSubmitting
                ? "Verifying access…"
                : `Enter ${FELENCHO_STUDIO.advancedMode}`}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            Sessions are temporary and access is
            evaluated from your assigned role and
            permissions.
          </p>
        </section>
      </div>
    </main>
  );
}
