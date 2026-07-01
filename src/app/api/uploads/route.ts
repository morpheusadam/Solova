import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { env } from "~/env";
import { auth } from "~/server/auth";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/** Stores an uploaded file on disk and returns its serving URL. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is larger than 20 MB" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const stored = `${randomUUID()}-${safeName}`;

  await mkdir(env.UPLOADS_DIR, { recursive: true });
  await writeFile(
    path.join(env.UPLOADS_DIR, stored),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ url: `/api/uploads/${stored}`, fileName: file.name });
}
