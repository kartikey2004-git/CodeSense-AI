"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  ThemeAnimationType,
  useModeAnimation,
} from "react-theme-switch-animation";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  const { ref, toggleSwitchTheme } = useModeAnimation({
    globalClassName: "dark",
    animationType: ThemeAnimationType.CIRCLE,
    duration: 650,
    isDarkMode: isDark,
    onDarkModeChange: (nextIsDark) => {
      setTheme(nextIsDark ? "dark" : "light");
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button aria-label="Toggle theme" variant="outline" size="icon" />;
  }

  const onToggle = async () => {
    const nextIsDark = !isDark;
    try {
      await toggleSwitchTheme();
    } catch {
      setTheme(nextIsDark ? "dark" : "light");
      return;
    }
    setTheme(nextIsDark ? "dark" : "light");
  };

  return (
    <Button
      ref={ref}
      aria-label="Toggle theme"
      variant="outline"
      size="icon"
      onClick={() => void onToggle()}
      className="transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      {isDark ? (
        <Sun className="size-4 transition-transform duration-300" />
      ) : (
        <Moon className="size-4 transition-transform duration-300" />
      )}
    </Button>
  );
}
