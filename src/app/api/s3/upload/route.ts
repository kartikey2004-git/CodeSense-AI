import { NextResponse } from "next/server";
import z from "zod";
import { v4 as uuidV4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "@/lib/s3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Schema for validating the request body
const uploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  size: z.number(),
});

// This is a public route handler , so we have to do server side validation of the request body or payload

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // upload request validation with zod
    const validation = uploadRequestSchema.safeParse(body);

    // if validation fails, return error
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // extract data from validation
    const { contentType, fileName, size } = validation.data;

    // To generate a presigned URL, we have to provide unique key for reference unique file later in s3 bucket and also retrieve it from there

    const uniqueKey = `${uuidV4()}-${fileName}`;

    /*
    
    - now we have to create a s3 bucket to finally generate a presigned URL (we can use any service which is compatible with s3 API like cloudflare r2, digitalocean spaces, etc.)

    - we'll use tigris as our s3 compatible storage service : globally distributed s3-compatible object storage

    -  We're using AWS SDK for JavaScript S3 Client for Node.js, Browser and React Native

    - We're using s3-request-presigner which provides a presigner based on signature V4 that will attempt to generate signed url for S3 bucket.

    */

    // Create a put object command which will be used to generate a presigned URL : structured way to define all details of our file

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size,
    });

    // Generate a presigned URL for the put object command

    const presignedUrl = await getSignedUrl(S3, command, {
      expiresIn: 360, // presigned url will be valid for 6 minutes
    });

    const response = {
      presignedUrl, // presigned url to upload file directly to s3

      key: uniqueKey, // unique key to identify the file in s3
    };

    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
