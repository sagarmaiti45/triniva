"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Shield } from "lucide-react";

export function Hero() {
  return (
    <section className="relative w-full p-4 pt-8 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-3xl mx-auto"
      >
        <h1 className="text-3xl md:text-6xl font-bold mb-4 md:mb-8 font-space-grotesk tracking-tight">
          Create Stunning AI Images{" "}
          <span className="gradient-text">For Free</span>
        </h1>
      </motion.div>
    </section>
  );
}