import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "CodeSense AI",
  description: "AI Github SAAS for devs",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const { sessionId } = await auth();

  const isSignedIn = Boolean(sessionId);

  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable}`}>
        <body>
          {isSignedIn && (
            <div>
              {/* Authenticated layout */}
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </div>
          )}

          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

// The ClerkProvidercomponent provides Clerk's authentication context to your app.

// It's recommended to wrap your entire app at the entry point with ClerkProvider to make authentication globally accessible.
