import { aiClient } from "@/config/aiclient.config";
import { Document } from "@langchain/core/documents";

export const aiSummariseCommit = async (diff: string) => {
  return aiClient.summariseDiff(diff);
};

export async function summariseCode(doc: Document) {
  return aiClient.summariseCode(doc);
}

export async function generateEmbedding(summary: string) {
  return aiClient.generateEmbedding(summary);
}

/*

// const rawDiff = `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
// index 2a4b6c1..9f8e3d2 100644
// --- a/src/middleware/auth.ts
// +++ b/src/middleware/auth.ts
// @@ -12,18 +12,31 @@ import { NextRequest, NextResponse } from "next/server";

//  export async function middleware(req: NextRequest) {
//    const token = req.cookies.get("access_token")?.value;

// -  if (!token) {
// -    return NextResponse.redirect(new URL("/sign-in", req.url));
// -  }
// +  // Allow public routes
// +  const publicRoutes = ["/sign-in", "/sign-up"];
// +  const isPublicRoute = publicRoutes.some((path) =>
// +    req.nextUrl.pathname.startsWith(path)
// +  );

// -  try {
// -    await verifyToken(token);
// -    return NextResponse.next();
// -  } catch {
// -    return NextResponse.redirect(new URL("/sign-in", req.url));
// -  }
// +  if (isPublicRoute) {
// +    return NextResponse.next();
// +  }
// +
// +  if (!token) {
// +    return NextResponse.redirect(new URL("/sign-in", req.url));
// +  }
// +
// +  try {
// +    await verifyToken(token);
// +    return NextResponse.next();
// +  } catch (error) {
// +    console.error("Auth middleware error:", error);
// +    return NextResponse.redirect(new URL("/sign-in", req.url));
// +  }
//  }
// `;

// const structuredDiffDoc = new Document({
//   pageContent: `
// Context:
// Auth middleware controlling route access.

// Removed logic:
// - Redirected all unauthenticated requests.

// Added logic:
// - Allows public routes before auth check.
// - Improves error logging.

// Diff:
// ${rawDiff}
// `,
//   metadata: {
//     type: "structured-diff",
//     file: "src/middleware/auth.ts",
//   },
// });


// const res = await aiSummariseCommit(rawDiff);
// console.log(res);

// const res1 = await summariseCode(structuredDiffDoc);
// console.log(res1);

// const res2 = await generateEmbedding("hi")
// console.log(res2);


*/
