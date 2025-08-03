"use client";

import { useEffect, useState } from 'react';

// Simple client-side fingerprint generation
function generateClientFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const fingerprint = {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
  };
  
  // Simple hash of fingerprint data
  const data = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

export function useGuestId() {
  const [guestId, setGuestId] = useState<string | null>(null);
  
  useEffect(() => {
    // Check localStorage first
    const storedId = localStorage.getItem('guestId');
    
    if (storedId) {
      setGuestId(storedId);
    } else {
      // Generate new guest ID
      const fingerprint = generateClientFingerprint();
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substr(2, 9);
      
      // Combine parts for uniqueness
      const newGuestId = `${timestamp}-${randomPart}-${fingerprint}`;
      
      localStorage.setItem('guestId', newGuestId);
      setGuestId(newGuestId);
    }
  }, []);
  
  return guestId;
}