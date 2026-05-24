"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Songs",
    href: "/song/tinta-triste",
  },
  {
    label: "Podcast",
    href: "/podcast",
  },
  {
    label: "Museum",
    href: "/museum",
  },
  {
    label: "Novels",
    href: "/novels",
  },
  {
    label: "About",
    href: "/about",
  },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[94%] max-w-5xl -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-3 py-3 text-white shadow-2xl backdrop-blur-2xl md:bottom-6">

      <div className="flex items-center justify-between gap-2 overflow-x-auto">

        {links.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] transition md:px-5 md:text-xs ${
                active
                  ? "bg-cyan-400 text-black shadow-[0_0_25px_rgba(0,255,255,0.65)]"
                  : "text-gray-300 hover:bg-white/10 hover:text-cyan-300"
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