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
    <div className="fixed bottom-0 left-0 z-[9999] flex w-full justify-center p-4">
      <nav className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur-2xl">

        {links.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition md:text-xs ${
                active
                  ? "bg-cyan-400 text-black"
                  : "bg-white/5 text-gray-300 hover:bg-cyan-400 hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}