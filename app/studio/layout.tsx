import type { ReactNode } from "react";

export const metadata = {
  title: "Felencho Studio OS",
  description: "Private Creative Operating System",
};

export default function StudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex h-screen bg-[#0b0b0c] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-white/10 bg-[#111214]">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <div>
            <h1 className="text-lg font-bold tracking-wide">
              Felencho Studio OS
            </h1>
            <p className="text-xs text-zinc-500">
              Creative Operating System
            </p>
          </div>
        </div>

        <nav className="p-4 space-y-2 text-sm">

          <MenuItem title="🏠 Home" href="/studio" />

          <MenuItem title="🎬 Producer" href="/studio/producer" />

          <MenuItem title="🎙 Podcast" href="/studio/podcast" />

          <MenuItem title="🎵 Music" href="/studio/music" />

          <MenuItem title="🤖 AI" href="/studio/ai" />

          <MenuItem title="👥 Virtual Humans" href="/studio/avatars" />

          <MenuItem title="🎥 Live" href="/studio/live" />

          <MenuItem title="📁 Assets" href="/studio/assets" />

          <MenuItem title="🧠 Core" href="/studio/core" />

          <MenuItem title="📊 Analytics" href="/studio/analytics" />

          <MenuItem title="🔐 Security" href="/studio/security" />

          <MenuItem title="⚙ Settings" href="/studio/settings" />

        </nav>
      </aside>

      {/* Workspace */}
      <section className="flex flex-1 flex-col">

        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#141517] px-6">

          <div>
            <h2 className="text-lg font-semibold">
              Workspace
            </h2>

            <p className="text-xs text-zinc-500">
              Welcome to Felencho Studio OS
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="h-2 w-2 rounded-full bg-green-500" />

            <span className="text-sm text-zinc-400">
              Bob Online
            </span>

          </div>

        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#18191b] p-8">
          {children}
        </div>

        {/* Status Bar */}
        <footer className="flex h-8 items-center justify-between border-t border-white/10 bg-[#111214] px-4 text-xs text-zinc-500">

          <span>Felencho Studio OS v1.0</span>

          <span>Private Workspace</span>

        </footer>

      </section>
    </main>
  );
}

function MenuItem({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg px-4 py-3 transition hover:bg-white/10"
    >
      {title}
    </a>
  );
}