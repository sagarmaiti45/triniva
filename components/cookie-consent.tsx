"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already provided consent
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show consent banner after a slight delay
      const timer = setTimeout(() => setShowConsent(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setShowConsent(false);
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="w-full">
            <div className="bg-card shadow-lg border-t border-border p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Cookie className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">We use cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your experience, analyze site traffic, and for security purposes. 
                    By continuing to use our site, you agree to our use of cookies.
                  </p>
                </div>

                <div className="flex flex-row gap-2 w-full md:w-auto">
                  <Button
                    onClick={handleDecline}
                    variant="outline"
                    size="sm"
                    className="flex-1 md:flex-initial"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleAccept}
                    size="sm"
                    className="flex-1 md:flex-initial bg-primary hover:bg-primary/90 text-white"
                  >
                    Accept Cookies
                  </Button>
                </div>

                <button
                  onClick={handleDecline}
                  className="absolute top-2 right-2 md:hidden text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}