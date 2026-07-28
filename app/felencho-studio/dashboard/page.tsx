import type {
  Metadata,
} from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canAccessFelenchoStudio,
} from "../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
  getFelenchoStudioSession,
} from "../../avatar-engine/auth/GenesisSession";
import {
  FELENCHO_STUDIO,
  FELENCHO_STUDIO_VERSION_LABEL,
} from "../../avatar-engine/config/GenesisConfig";
import StudioLogoutButton from "../components/StudioLogoutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    `Dashboard | ${FELENCHO_STUDIO_VERSION_LABEL}`,
  description:
    "Private production dashboard for Felencho Studio.",
};

export default async function FelenchoStudioDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    FELENCHO_STUDIO_SESSION_COOKIE,
  )?.value;
  const session =
    await getFelenchoStudioSession(token);

  if (
    !session ||
    !canAccessFelenchoStudio(
      session.role,
      session.permissions,
      "advanced",
    )
  ) {
    redirect(
      "/felencho-studio/auth?next=/felencho-studio/dashboard",
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030506] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_35%)]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-cyan-300/15 pb-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Private Production Environment
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {FELENCHO_STUDIO.name}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {FELENCHO_STUDIO_VERSION_LABEL}
            </p>
          </div>

          <StudioLogoutButton />
        </header>

        <section className="grid gap-6 py-12 md:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
          <article className="rounded-[2rem] border border-cyan-300/15 bg-[#0a1013] p-8 shadow-2xl shadow-cyan-950/20 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
              Actor Production
            </p>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
              Digital Actor Editor
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
              Create, configure, validate, and
              package production-ready Digital
              Actors for the Felencho physical
              studio.
            </p>

            <Link
              href="/felencho-studio/advanced"
              className="mt-8 inline-flex rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#03202a] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
            >
              Open Studio Editor
            </Link>
          </article>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Active Session
            </p>

            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="text-white/35">
                  Role
                </dt>
                <dd className="mt-1 capitalize text-white/80">
                  {session.role}
                </dd>
              </div>
              <div>
                <dt className="text-white/35">
                  Access
                </dt>
                <dd className="mt-1 text-emerald-300">
                  Authorized
                </dd>
              </div>
              <div>
                <dt className="text-white/35">
                  Environment
                </dt>
                <dd className="mt-1 text-white/80">
                  Production
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
