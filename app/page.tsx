"use client";

import { useState } from "react";
import { ImageGenerator } from "@/components/image-generator";
import { Hero } from "@/components/hero";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative w-full h-full">
      {/* Background image covering entire page */}
      <div className="fixed inset-0 z-0" style={{ zIndex: -1 }}>
        <img
          src="/images/auth-bg.webp"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {/* Multi-layer fading for smooth blend */}
        <div className="absolute inset-0">
          {/* Base overlay for overall dimming */}
          <div className="absolute inset-0 bg-background/50 dark:bg-background/60" />
          
          {/* Radial vignette */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(var(--background-rgb)/0.3) 40%, rgba(var(--background-rgb)/0.7) 70%, rgba(var(--background-rgb)/0.9) 100%)'
          }} />
          
          {/* Edge fades */}
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background via-background/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-background/90 via-background/50 to-transparent" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-0 flex flex-col md:block md:space-y-8 h-full md:h-auto">
        <Hero />
        <div className="flex-1 md:hidden" />
        <div className="mt-auto md:mt-0">
          <ImageGenerator />
        </div>
      </div>
    </div>
  );
}