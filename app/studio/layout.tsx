import type { ReactNode } from "react";
import Image from "next/image";

export const metadata = {
  title: "Felencho Studio OS",
  description: "Private Creative Operating System",
};

const menuItems = [
  ["🏠", "Home", "/studio"],
  ["🎬", "Producer", "/studio/producer"],
  ["🎙", "Podcast", "/studio/podcast"],
  ["🎵", "Music", "/studio/music"],
  ["🤖", "AI", "/studio/ai"],
  ["👥", "Humans", "/studio/avatars"],
  ["🎥", "Live", "/studio/live"],
  ["📁", "Assets", "/studio/assets"],
  ["🧠", "Core", "/studio/core"],
  ["📊", "Analytics", "/studio/analytics"],
  ["🔐", "Security", "/studio/security"],
  ["⚙", "Settings", "/studio/settings"],
];

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b0b0c] text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#111214] lg:block">
          <StudioBrand />

          <nav className="p-4 space-y-2 text-sm">
            {menuItems.map(([icon, label, href]) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 transition hover:bg-white/10"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#141517] px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/lion/lion-icon.png"
                alt="Felencho"
                width={34}
                height={34}
                className="rounded-md"
                priority
              />

              <div>
                <h2 className="text-base font-semibold sm:text-lg">
                  Felencho Studio OS
                </h2>
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Private Creative Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="h-2 w-2 rounded-full bg-zinc-500" />
              <span className="text-zinc-400">Sleeping</span>
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto border-b border-white/10 bg-[#111214] px-3 py-3 lg:hidden">
            {menuItems.map(([icon, label, href]) => (
              <a
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </a>
            ))}
          </nav>

          <div className="flex-1 overflow-auto bg-[#18191b] p-4 sm:p-6 lg:p-8">
            {children}
          </div>

          <footer className="flex h-8 items-center justify-between border-t border-white/10 bg-[#111214] px-3 text-[10px] text-zinc-500 sm:px-4 sm:text-xs">
            <span>Studio OS v1.0</span>
            <span>Private Workspace</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

function StudioBrand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 p-5">
      <Image
        src="/brand/lion/lion-icon.png"
        alt="Felencho"
        width={48}
        height={48}
        className="rounded-lg"
        priority
      />

      <div>
        <h1 className="text-lg font-bold tracking-wide">
          Felencho Studio OS
        </h1>
        <p className="text-xs text-zinc-500">Creative Operating System</p>
      </div>
    </div>
  );
}