"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Shield } from "lucide-react";

export function Hero() {
  return (
    <section className="relative w-full p-8 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-3xl mx-auto"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-8 font-space-grotesk tracking-tight">
          Create Stunning AI Images{" "}
          <span className="gradient-text">For Free</span>
        </h1>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-black/5 dark:border-white/5">
            <Zap className="h-5 w-5 text-gradient-start" />
            <span className="text-sm font-medium font-dm-sans">Lightning Fast</span>
          </div>
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-black/5 dark:border-white/5">
            <Shield className="h-5 w-5 text-gradient-end" />
            <span className="text-sm font-medium font-dm-sans">100% Free</span>
          </div>
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-black/5 dark:border-white/5">
            <Sparkles className="h-5 w-5 text-gradient-start" />
            <span className="text-sm font-medium font-dm-sans">Premium Quality</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}