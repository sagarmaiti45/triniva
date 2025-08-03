"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggleSwitch({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`w-16 h-8 ${className}`} />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
        isDark ? "bg-blue-600" : "bg-amber-400"
      } ${className}`}
      aria-label="Toggle theme"
    >
      {/* Background icons */}
      <span className="absolute left-1 text-white">
        <Sun className="h-4 w-4" />
      </span>
      <span className="absolute right-1 text-white">
        <Moon className="h-4 w-4" />
      </span>

      {/* Sliding circle */}
      <motion.span
        className="absolute h-6 w-6 rounded-full bg-white shadow-lg"
        initial={false}
        animate={{
          x: isDark ? 34 : 2,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />

      {/* Glow effect */}
      <motion.span
        className={`absolute inset-0 rounded-full ${
          isDark ? "bg-blue-400" : "bg-amber-300"
        }`}
        initial={false}
        animate={{
          opacity: [0, 0.2, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 0.3,
        }}
      />
    </button>
  );
}