"use client";

import { motion } from "framer-motion";
import { Image, Palette, Wand2, Layers, Download, Users } from "lucide-react";

const features = [
  {
    icon: Image,
    title: "Text to Image",
    description: "Transform your ideas into stunning visuals with our AI-powered generation.",
  },
  {
    icon: Wand2,
    title: "Image Enhancement",
    description: "Upscale and enhance your images to professional quality.",
  },
  {
    icon: Palette,
    title: "Style Transfer",
    description: "Apply artistic styles like anime, photographic, or digital art.",
  },
  {
    icon: Layers,
    title: "Smart Editing",
    description: "Edit specific parts of your image with AI-powered masking.",
  },
  {
    icon: Download,
    title: "High Resolution",
    description: "Download your creations in high resolution for any use.",
  },
  {
    icon: Users,
    title: "Community Gallery",
    description: "Explore and get inspired by creations from our community.",
  },
];

export function Features() {
  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Professional-grade AI tools, completely free. No hidden fees, no surprises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative p-6 overflow-visible group"
          >
            {/* Gradient glow effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-gradient-to-br from-gradient-start/10 to-gradient-end/10 blur-2xl dark:from-gradient-start/20 dark:to-gradient-end/20 transition-all duration-500 group-hover:scale-110" />
            </div>
            <div className="relative z-10">
              <feature.icon className="h-10 w-10 mb-4 text-gradient-start" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}