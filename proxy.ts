import { NextRequest, NextResponse } from "next/server";

import {
  accessAreaForPath,
  canAccessFelenchoStudio,
} from "./app/avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
  getFelenchoStudioSession,
} from "./app/avatar-engine/auth/GenesisSession";

function accessUrlForPath(
  pathname: string,
  requestUrl: string,
): URL {
  if (
    pathname === "/studio" ||
    pathname.startsWith("/studio/")
  ) {
    return new URL(
      "/studio/access",
      requestUrl,
    );
  }

  const accessUrl = new URL(
    "/felencho-studio/auth",
    requestUrl,
  );

  accessUrl.searchParams.set(
    "next",
    pathname,
  );

  return accessUrl;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/studio/access") {
    return NextResponse.next();
  }

  const accessArea =
    accessAreaForPath(pathname);

  if (!accessArea) {
    return NextResponse.next();
  }

  const token = request.cookies.get(
    FELENCHO_STUDIO_SESSION_COOKIE,
  )?.value;

  const session =
    await getFelenchoStudioSession(token);

  if (
    !session ||
    !canAccessFelenchoStudio(
      session.role,
      session.permissions,
      accessArea,
    )
  ) {
    const response = NextResponse.redirect(
      accessUrlForPath(
        pathname,
        request.url,
      ),
    );

    if (token && !session) {
      response.cookies.delete(
        FELENCHO_STUDIO_SESSION_COOKIE,
      );
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/avatar-engine/studio/:path*",
    "/felencho-studio/:path*",
  ],
};
