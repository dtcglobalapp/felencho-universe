"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <div className="fixed left-0 top-0 z-[9999999] w-full bg-red-600 p-4 text-center text-xl font-black text-white">
      MENU TEST —
      <Link href="/" className="mx-3 underline">
        HOME
      </Link>
      <Link href="/song/tinta-triste" className="mx-3 underline">
        SONGS
      </Link>
      <Link href="/podcast" className="mx-3 underline">
        PODCAST
      </Link>
    </div>
  );
}