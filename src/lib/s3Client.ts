import { S3Client } from "@aws-sdk/client-s3";

// S3 Client for Tigris Storage

export const S3 = new S3Client({
  region: "auto", // Tigris uses auto region

  endpoint: "https://t3.storage.dev", // endpoint for file uploads at Tigris Storage

  forcePathStyle: false,
});

// Tigris uses path-style URLs , we set it to false because we are using the endpoint that ends with /s3/

// so we need to set forcePathStyle to false so that the AWS SDK doesn't add two slashes to the URL.
