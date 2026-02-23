import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Page() {
  return (
    <main className="bg-background text-foreground min-h-dvh">
      <div className="app-container flex justify-end pt-6">
        <ThemeToggle />
      </div>
      <div className="flex justify-center px-4 pt-10 pb-12 sm:pt-16">
        <SignIn />
      </div>
    </main>
  );
}
