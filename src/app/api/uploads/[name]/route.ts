import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { env } from "~/env";
import { auth } from "~/server/auth";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

/** Serves a stored upload. Filenames are server-generated UUIDs — no traversal. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const safe = path.basename(name);
  const filePath = path.join(env.UPLOADS_DIR, safe);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const size = statSync(filePath).size;
  const ext = path.extname(safe).toLowerCase();
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
