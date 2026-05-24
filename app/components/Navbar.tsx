"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/" },
  { label: "Songs", href: "/song/tinta-triste" },
  { label: "Podcast", href: "/podcast" },
  { label: "Museum", href: "/museum" },
  { label: "Novels", href: "/novels" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-5 left-1/2 z-[999999] -translate-x-1/2 rounded-full border border-cyan-400/40 bg-black/90 px-3 py-3 shadow-[0_0_35px_rgba(0,255,255,0.35)] backdrop-blur-2xl">
      <div className="flex max-w-[92vw] items-center gap-2 overflow-x-auto">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href.includes("/song") && pathname.startsWith("/song"));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition ${
                active
                  ? "bg-cyan-400 text-black"
                  : "bg-white/5 text-white hover:bg-cyan-400 hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}