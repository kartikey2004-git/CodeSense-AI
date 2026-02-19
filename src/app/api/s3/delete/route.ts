import { S3 } from "@/lib/s3Client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

// route handler for deleting files from S3 bucket expects key in request body

export async function DELETE(request: Request) {
  try {
    // parse the request body
    const body = await request.json();

    // extract the key from the request body
    const key = body.key;

    // check if key is provided
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // create delete object command from aws sdk which we will use for delete the file from s3 bucket

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    // send the command to s3
    await S3.send(command);

    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to delete files" },
      { status: 500 },
    );
  }
}
