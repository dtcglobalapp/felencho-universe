import { NextResponse } from "next/server";

import {
  FELENCHO_STUDIO_SESSION_COOKIE,
} from "../../../avatar-engine/auth/GenesisSession";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.headers.set(
    "Cache-Control",
    "private, no-store",
  );

  response.cookies.set({
    name: FELENCHO_STUDIO_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
