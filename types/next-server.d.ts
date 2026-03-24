declare module "next/server" {
  export { NextRequest } from "next/dist/server/web/spec-extension/request";
  export { NextResponse } from "next/dist/server/web/spec-extension/response";
  export { ImageResponse } from "next/dist/server/web/spec-extension/image-response";
  export {
    userAgent,
    userAgentFromString,
  } from "next/dist/server/web/spec-extension/user-agent";
  export { URLPattern } from "next/dist/server/web/spec-extension/url-pattern";
}

declare module "next/server.js" {
  export { NextRequest } from "next/dist/server/web/spec-extension/request";
  export { NextResponse } from "next/dist/server/web/spec-extension/response";
  export { ImageResponse } from "next/dist/server/web/spec-extension/image-response";
  export {
    userAgent,
    userAgentFromString,
  } from "next/dist/server/web/spec-extension/user-agent";
  export { URLPattern } from "next/dist/server/web/spec-extension/url-pattern";
}

declare module "next/types.js" {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module "next" {
  export interface NextConfig {
    [key: string]: any;
  }

  export type Metadata = {
    title?: string;
    description?: string;
    [key: string]: any;
  };
}
