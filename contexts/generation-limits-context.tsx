"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useGuestId } from '@/hooks/use-guest-id';
import { useAuth } from '@/contexts/simple-auth-context';

interface GenerationLimits {
  used: number;
  limit: number;
  remaining: number;
  isGuest: boolean;
}

interface GenerationLimitsContextType {
  limits: GenerationLimits | null;
  refreshLimits: () => Promise<void>;
  updateLimits: (newLimits: GenerationLimits) => void;
}

const GenerationLimitsContext = createContext<GenerationLimitsContextType | undefined>(undefined);

export function GenerationLimitsProvider({ children }: { children: React.ReactNode }) {
  const guestId = useGuestId();
  const { user } = useAuth();
  const [limits, setLimits] = useState<GenerationLimits | null>({
    used: 0,
    limit: user ? 10 : 3,
    remaining: user ? 10 : 3,
    isGuest: !user
  });

  const refreshLimits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (guestId && !user) {
        params.append('guestId', guestId);
      }
      
      const response = await fetch(`/api/chat-history?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Refreshed limits in context:", data.limits);
        if (data.limits) {
          setLimits(data.limits);
        }
      }
    } catch (error) {
      console.error('Failed to refresh limits:', error);
    }
  }, [guestId, user]);

  const updateLimits = useCallback((newLimits: GenerationLimits) => {
    console.log("Updating limits in context:", newLimits);
    setLimits(newLimits);
  }, []);

  // Fetch limits on mount and when user/guestId changes
  useEffect(() => {
    refreshLimits();
  }, [refreshLimits]);

  return (
    <GenerationLimitsContext.Provider value={{ limits, refreshLimits, updateLimits }}>
      {children}
    </GenerationLimitsContext.Provider>
  );
}

export function useGenerationLimits() {
  const context = useContext(GenerationLimitsContext);
  if (context === undefined) {
    throw new Error('useGenerationLimits must be used within a GenerationLimitsProvider');
  }
  return context;
}