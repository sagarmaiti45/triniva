"use client";

import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`w-9 h-9 ${className}`} />;
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative p-2 rounded-lg hover:bg-accent transition-colors overflow-hidden ${className}`}
      aria-label="Toggle theme"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ y: -30, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 30, opacity: 0, rotate: 90 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
          >
            <Moon className="h-4 w-4 md:h-5 md:w-5 text-blue-500/80" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: -30, opacity: 0, rotate: 90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 30, opacity: 0, rotate: -90 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
          >
            <Sun className="h-4 w-4 md:h-5 md:w-5 text-amber-500/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ripple effect on click */}
      <motion.div
        className={`absolute inset-0 rounded-lg ${
          isDark ? "bg-blue-500" : "bg-amber-500"
        }`}
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    </motion.button>
  );
}