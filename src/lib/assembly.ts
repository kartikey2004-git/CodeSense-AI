import { AssemblyAI } from "assemblyai";

// Validate AssemblyAI API key
const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;

if (!assemblyAIKey) {
  throw new Error("ASSEMBLYAI_API_KEY environment variable is not set");
}

const client = new AssemblyAI({ apiKey: assemblyAIKey });

function msToTime(ms: number) {
  const seconds = ms / 1000;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")} : ${remainingSeconds.toString().padStart(2, "0")}`;
}

export type summary = {
  start: string;
  end: string;
  gist: string;
  headline: string;
  summary: string;
};

// const res = msToTime(1000)
// console.log(res);

// const params = {
//   // audio: audioFile,
//   // language_detection: true,
//   // Uses universal-3-pro for en, es, de, fr, it, pt. Else uses universal-2 for support across all other languages
//   // speech_models: ["universal-3-pro", "universal-2"],
// };

export const processMeeting = async (meetingUrl: string) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Processing meeting (attempt ${attempt}/${maxRetries}): ${meetingUrl}`,
      );

      const transcript = await client.transcripts.transcribe({
        audio: meetingUrl,
        auto_chapters: true,
        speech_models: ["universal-3-pro", "universal-2"],
      });

      if (!transcript.text) {
        throw new Error("No transcript found in AssemblyAI response");
      }

      const summaries =
        (transcript.chapters?.map((chapter) => ({
          start: msToTime(chapter.start),
          end: msToTime(chapter.end),
          gist: chapter.gist,
          headline: chapter.headline,
          summary: chapter.summary,
        })) as summary[]) || [];

      console.log(
        `Successfully processed meeting: ${summaries.length} chapters extracted`,
      );

      return {
        summaries,
        transcript: transcript.text,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Unknown error in processMeeting");
      console.error(
        `Meeting processing attempt ${attempt} failed:`,
        lastError.message,
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `Failed to process meeting after ${maxRetries} attempts:`,
    lastError,
  );
  throw lastError || new Error("Meeting processing failed");
};

// const audioFile = "https://assembly.ai/wildfires.mp3";

// const res = await processMeeting(audioFile);
// console.log(res);
