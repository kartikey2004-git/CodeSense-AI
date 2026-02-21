import { AssemblyAI } from "assemblyai";

// console.log(process.env.ASSEMBLYAI_API_KEY)

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

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
  try {
    const transcript = await client.transcripts.transcribe({
      audio: meetingUrl,
      auto_chapters: true,
      speech_models: ["universal-3-pro", "universal-2"],
    });

    const summaries =
      (transcript.chapters?.map((chapter) => ({
        start: msToTime(chapter.start),
        end: msToTime(chapter.end),
        gist: chapter.gist,
        headline: chapter.headline,
        summary: chapter.summary,
      })) as summary[]) || [];

    if (!transcript.text) throw new Error("No transcript found");

    return {
      summaries,
    };
  } catch (error) {
    console.error(error);
  }
};

// const audioFile = "https://assembly.ai/wildfires.mp3";

// const res = await processMeeting(audioFile);
// console.log(res);
