import { processMeeting, type summary } from "@/lib/assembly";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const maxDuration = 300; // 5 minutes

const bodyParser = z.object({
  meetingUrl: z.string(),
  projectId: z.string(),
  meetingId: z.string(),
});

export async function POST(req: NextRequest) {
  console.log("/api/process-meeting hit");

  const { userId } = await auth();
  console.log("userId:", userId);

  if (!userId) {
    console.log("Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("parsing body...");
    const body = await req.json();
    console.log("raw body:", body);

    const parsed = bodyParser.safeParse(body);

    if (!parsed.success) {
      console.log("Zod validation failed:", parsed.error);
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { meetingId, meetingUrl, projectId } = parsed.data;
    console.log("parsed body:", parsed.data);

    console.log("calling processMeeting...");
    const result = await processMeeting(meetingUrl);
    console.log("processMeeting result:", result);

    if (!result) {
      console.log("processMeeting returned null");
      return NextResponse.json(
        { error: "Failed to process meeting" },
        { status: 500 },
      );
    }

    const { summaries } = result;
    console.log("summaries count:", summaries?.length);

    console.log("creating issues...");
    await db.issue.createMany({
      data: summaries.map((summary: summary) => ({
        start: summary.start,
        end: summary.end,
        gist: summary.gist,
        headline: summary.headline,
        summary: summary.summary,
        meetingId,
      })),
    });

    console.log("issues inserted");

    console.log("updating meeting...");
    await db.meeting.update({
      where: { id: meetingId },
      data: {
        status: "COMPLETED",
        name: summaries[0]?.headline ?? "Meeting",
      },
    });

    console.log("meeting updated");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("💥 process-meeting crashed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
