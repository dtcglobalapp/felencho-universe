import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const memoryPath = path.join(
      process.cwd(),
      "project-memory",
      "current.json"
    );

    const rawMemory = fs.readFileSync(memoryPath, "utf8");
    const projectMemory = JSON.parse(rawMemory);

    return NextResponse.json(projectMemory, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Felencho-Project-Memory": "current",
        "X-Felencho-Memory-Version":
          projectMemory?.project?.version || "unknown"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    return NextResponse.json(
      {
        error: "No se pudo leer la memoria del proyecto.",
        details: message
      },
      { status: 500 }
    );
  }
}
