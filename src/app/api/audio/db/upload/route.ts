import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // parse the request body
  const body = await request.json();

  // extract the key, mime type and size from the request body
  const { key, mimeType, size } = body;

  if (!key) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // get the bucket name from environment variables
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 500 });
  }

  // get the user id from auth
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // create a new audio file in the database
  const audio = await db.audioFile.create({
    data: {
      userId: userId,
      bucket,
      key: key,
      mimeType: mimeType,
      size: size,
    },
  });

  return NextResponse.json({ success: true, audioKey: audio.key });
}
