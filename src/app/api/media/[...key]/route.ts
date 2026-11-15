import { NextResponse } from "next/server";
import { getObject } from "lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

/** Serves PUBLIC media for the local storage driver only. Private objects are never served here. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  if (key[0] !== "public" || key.some((k) => k === ".." || k.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await getObject(`local:${key.join("/")}`);
    const ext = key[key.length - 1].split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
