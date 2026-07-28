"use client";

import {
  useState,
} from "react";

export default function StudioLogoutButton() {
  const [isSigningOut, setIsSigningOut] =
    useState(false);

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/studio/logout", {
        method: "POST",
      });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={() => {
        void signOut();
      }}
      className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition hover:border-white/35 hover:text-white disabled:cursor-wait disabled:opacity-50"
    >
      {isSigningOut
        ? "Signing out…"
        : "Sign out"}
    </button>
  );
}
