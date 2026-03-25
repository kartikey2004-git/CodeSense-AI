"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <Suspense fallback={<ErrorPageFallback />}>
      <ErrorPageContent />
    </Suspense>
  );
}

function ErrorPageContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "An unexpected error occurred";

  useEffect(() => {
    console.error("Error page accessed with message:", message);
  }, [message]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-foreground text-4xl font-bold">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="space-y-4">
          <div className="text-muted-foreground text-sm">
            <p>Please try one of the following:</p>
            <ul className="mt-2 space-y-1">
              <li>• Refresh the page and try again</li>
              <li>• Check your internet connection</li>
              <li>• Contact support if the problem persists</li>
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="text-muted-foreground text-xs">
          Error ID: {Date.now()}
        </div>
      </div>
    </div>
  );
}

function ErrorPageFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-foreground text-4xl font-bold">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">Loading error details...</p>
        </div>
      </div>
    </div>
  );
}
