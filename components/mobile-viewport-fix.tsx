"use client";

import { useEffect } from "react";

export function MobileViewportFix() {
  useEffect(() => {
    // Function to set the viewport height
    const setViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight * 0.01;
      // Set the value in the --vh custom property
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Also set on body for better compatibility
      document.body.style.setProperty('--vh', `${vh}px`);
      
      // Force mobile viewport height on root elements
      if (window.innerWidth <= 768) {
        document.documentElement.style.height = `${window.innerHeight}px`;
        document.body.style.height = `${window.innerHeight}px`;
      }
    };

    // Set the initial value
    setViewportHeight();

    // Update on various events
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    window.addEventListener('load', setViewportHeight);
    
    // Also update after a delay to catch any late browser UI changes
    setTimeout(setViewportHeight, 100);
    setTimeout(setViewportHeight, 500);

    // Cleanup
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
      window.removeEventListener('load', setViewportHeight);
    };
  }, []);

  return null;
}