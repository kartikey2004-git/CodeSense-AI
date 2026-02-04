import { FileText, History, Mic, Search, Users, Zap } from "lucide-react";
import type { ElementType } from "react";

export interface FeatureItem {
  icon: ElementType;
  title: string;
  text: string;
  color: string;
}

export const FEATURES: FeatureItem[] = [
  {
    icon: FileText,
    title: "Automatic Code Documentation",
    text: "Dionysus generates detailed documentation across your entire codebase, making it easier to understand structure and intent.",
    color: "text-red-600",
  },
  {
    icon: Search,
    title: "Codebase Search",
    text: "Quickly locate any function, file, or component with fast, context-aware search built for developers.",
    color: "text-blue-600",
  },
  {
    icon: Zap,
    title: "Commit Message Summaries",
    text: "AI-powered summaries keep you updated on the latest changes without digging through raw commit logs.",
    color: "text-yellow-600",
  },
  {
    icon: Mic,
    title: "Meeting Transcription",
    text: "Dionysus converts your meetings into accurate transcripts with key topics and clear summaries.",
    color: "text-green-600",
  },
  {
    icon: History,
    title: "Real-Time Meeting Search",
    text: "Instant contextual search across all past meetings so you can find answers without rewatching long recordings.",
    color: "text-purple-600",
  },
  {
    icon: Users,
    title: "Collaborative Platform",
    text: "Teams can collaborate, explore documentation, review summaries, and interact with the entire knowledge layer together.",
    color: "text-cyan-600",
  },
];

export const testimonials = [
  {
    id: 1,
    name: "Aarav Sharma",
    handle: "@aarav_codes",
    text: "CodeSense AI legit saved me hours. The auto-docs are clearer than most docs I've written myself.",
    date: "FEBRUARY 12, 2025",
    verified: true,
  },
  {
    id: 2,
    name: "Rohan Verma",
    handle: "@rohanbuilds",
    text: "The codebase search is insane. Found a function buried 6 folders deep instantly.",
    date: "MARCH 03, 2025",
    verified: true,
  },
  {
    id: 3,
    name: "Kunal Gupta",
    handle: "@kunaldev",
    text: "Commit summaries are stupidly accurate. Haven't opened raw commit logs in days.",
    date: "JANUARY 27, 2025",
    verified: false,
  },
  {
    id: 4,
    name: "Siddharth Malhotra",
    handle: "@sidtechie",
    text: "Meeting transcripts + contextual search? Bro… finally stopped taking notes in standups.",
    date: "FEBRUARY 25, 2025",
    verified: true,
  },
  {
    id: 5,
    name: "Arjun Patel",
    handle: "@arjunstack",
    text: "Didn’t expect the meeting search to work this well. It digs up the exact timestamp every time.",
    date: "APRIL 10, 2025",
    verified: false,
  },
  {
    id: 6,
    name: "Neeraj Aggarwal",
    handle: "@neerajcodes",
    text: "Honestly the first dev tool this year that actually reduces cognitive load.",
    date: "MARCH 22, 2025",
    verified: false,
  },
  {
    id: 7,
    name: "Rahul Roy",
    handle: "@rahulbuilds",
    text: "Our onboarding time dropped massively. New devs understand the codebase in a day.",
    date: "FEBRUARY 09, 2025",
    verified: false,
  },
  {
    id: 8,
    name: "Aditya Mehta",
    handle: "@adityadev",
    text: "Threw a messy repo at CodeSense AI and the auto-docs were cleaner than my own documentation.",
    date: "APRIL 02, 2025",
    verified: true,
  },
  {
    id: 9,
    name: "Disha Kapoor",
    handle: "@dishatech",
    text: "Everything feels organized now. The whole project finally feels… understandable.",
    date: "MARCH 15, 2025",
    verified: true,
  },
];
