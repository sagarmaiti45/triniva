"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would integrate with your chat system
      console.log("Sending message:", message);
      setMessage("");
      // For now, just show a toast or handle the message
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, duration: 0.3 }}
        className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-gradient-start to-gradient-end flex items-center justify-center hover:scale-105 group"
        >
          {isOpen ? (
            <X className="h-5 w-5 md:h-6 md:w-6 text-white" />
          ) : (
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
          )}
        </button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 md:bottom-24 right-4 md:right-6 w-[90vw] max-w-sm md:w-80 h-[70vh] md:h-96 bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Support Chat</h3>
                  <p className="text-xs text-muted-foreground">We're here to help!</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Welcome Message */}
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white">AI</span>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-sm max-w-[240px]">
                    <p>Hello! I'm here to help you with Triniva AI. How can I assist you today?</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Quick actions:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => setMessage("How do I generate better images?")}
                    >
                      💡 Tips for better images
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => setMessage("What are the different style presets?")}
                    >
                      🎨 Style presets help
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => setMessage("I'm having technical issues")}
                    >
                      🔧 Technical support
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="h-10 w-10 bg-gradient-primary"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}