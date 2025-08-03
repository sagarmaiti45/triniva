"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Clock, Trash2, ArrowRight, Info, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/sidebar-context";
import Image from "next/image";
import { useGuestId } from "@/hooks/use-guest-id";
import { useAuth } from "@/contexts/simple-auth-context";
import { useGenerationLimits } from "@/contexts/generation-limits-context";
import { useSwipeable } from "react-swipeable";

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  imageUrl?: string;
}

export function Sidebar() {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const pathname = usePathname();
  const guestId = useGuestId();
  const { user } = useAuth();

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobileOpen) {
        setIsMobileOpen(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: true,
  });
  const { limits } = useGenerationLimits();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        console.log("Fetching history in sidebar:", { user: user?.email, guestId });
        const params = new URLSearchParams();
        if (guestId && !user) {
          params.append('guestId', guestId);
        }
        
        const response = await fetch(`/api/chat-history?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          console.log("History response:", data);
          // Transform API data to sidebar format
          const transformed = data.history.map((item: any) => ({
            id: item.id,
            title: item.prompt.length > 30 ? item.prompt.substring(0, 30) + '...' : item.prompt,
            timestamp: new Date(item.createdAt),
            preview: item.prompt,
            imageUrl: item.imageUrl
          }));
          setChatHistory(transformed);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };
    
    // Fetch initially and set up polling
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [user, guestId, limits]); // Refetch when limits change (after generation)

  // Handle swipe gestures
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setIsMobileOpen(true);
    }
    
    // Reset position
    await controls.start({ x: 0 });
  };

  return (
    <>
      {/* Swipe detector for mobile */}
      {!isMobileOpen && (
        <motion.div
          className="fixed left-0 top-0 w-8 h-full z-30 md:hidden pointer-events-none"
          drag="x"
          dragConstraints={{ left: 0, right: 100 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          animate={controls}
          style={{ x, touchAction: 'pan-y' }}
        />
      )}

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        {...swipeHandlers}
        className={`fixed left-0 top-0 h-full bg-card z-40 flex flex-col transition-all duration-300 border-r border-border/30 w-[280px] ${
          isCollapsed ? 'md:w-[60px]' : 'md:w-[280px]'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Header - matches navbar height */}
        <div className="h-[72px] px-4 flex items-center border-b border-border/30 md:border-0">
          <div className="flex items-center justify-between w-full">
            <h2 className={`text-lg font-semibold ${isCollapsed ? 'md:hidden' : ''}`}>
              Chat History
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex ml-auto"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-2 md:p-3 flex justify-center md:block">
          <Button
            variant="ghost"
            className={`w-auto md:w-full h-8 md:h-10 text-xs md:text-base px-2 md:px-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 ${isCollapsed ? 'md:h-9 md:w-9 md:p-0 md:mx-auto' : ''}`}
            onClick={() => {
              // Handle new chat
              setIsMobileOpen(false);
            }}
          >
            <Plus className={`h-3 w-3 md:h-4 md:w-4 ${isCollapsed ? 'md:h-5 md:w-5' : ''}`} />
            <span className={`ml-1 md:ml-2 ${isCollapsed ? 'md:sr-only' : ''}`}>New Chat</span>
          </Button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1.5 md:space-y-2">
          {chatHistory.map((chat) => (
            <motion.div
              key={chat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedChat(chat)}
              className={`group relative rounded-lg cursor-pointer transition-colors hover:bg-accent p-2 md:p-3 ${
                isCollapsed ? 'md:p-2 md:flex md:justify-center md:items-center md:aspect-square' : ''
              } ${selectedChat?.id === chat.id ? 'bg-accent' : ''}`}
            >
              {/* Full view for mobile and expanded desktop */}
              <div className={`${isCollapsed ? 'md:hidden' : ''}`}>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm truncate pr-2">{chat.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatHistory(chatHistory.filter(h => h.id !== chat.id));
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.preview}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatTime(chat.timestamp)}</span>
                </div>
              </div>
              
              {/* Collapsed view for desktop only */}
              {isCollapsed && (
                <div className="hidden md:block">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {chat.title}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-2 md:p-4 relative`}>
          {/* Mobile - always show full footer */}
          <div className="md:hidden flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowInfoModal(true)}
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Triniva AI - All Rights Reserved
            </p>
          </div>
          
          {/* Desktop - respect collapsed state */}
          <div className="hidden md:block">
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-8 md:h-9"
                onClick={() => setShowInfoModal(true)}
              >
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowInfoModal(true)}
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Triniva AI - All Rights Reserved
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Info Modal - rendered outside sidebar for proper full-screen backdrop */}
      <AnimatePresence>
        {showInfoModal && (
          <>
            {/* Backdrop - covers entire screen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="fixed inset-0 bg-black/20 z-[9999]"
            />
            
            {/* Modal - positioned relative to footer but with high z-index */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`fixed ${
                isCollapsed 
                  ? 'left-[70px] bottom-4' 
                  : 'left-4 bottom-[70px]'
              } w-[280px] p-3 bg-card rounded-lg shadow-lg border border-border z-[10000]`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
              
              <p className="text-sm text-muted-foreground pr-4 leading-relaxed">
                Triniva AI is an innovative image generation platform that transforms 
                text prompts into stunning visuals using advanced AI models. With smart caching, 
                multiple model support, and an intuitive interface, it makes professional image creation 
                accessible to everyone. A product of Triniva.com.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Selected Chat Modal */}
      <AnimatePresence>
        {selectedChat && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChat(null)}
              className="fixed inset-0 bg-black/50 z-[9999]"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-card rounded-lg shadow-xl border border-border z-[10000] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-lg">Generated Image</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedChat(null)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Prompt */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Prompt</h4>
                  <p className="text-sm">{selectedChat.preview}</p>
                </div>
                
                {/* Image */}
                {selectedChat.imageUrl && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Generated Image</h4>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary/20">
                      <img
                        src={selectedChat.imageUrl}
                        alt={selectedChat.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <div className="text-xs text-muted-foreground">
                  Generated {formatTime(selectedChat.timestamp)}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Copy prompt to clipboard
                    navigator.clipboard.writeText(selectedChat.preview);
                    // Simple feedback without toast
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) {
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 1000);
                    }
                  }}
                >
                  Copy Prompt
                </Button>
                {selectedChat.imageUrl && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      try {
                        if (!selectedChat.imageUrl) return;
                        const response = await fetch(selectedChat.imageUrl);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `triniva-${selectedChat.id}.png`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error('Failed to download image:', error);
                      }
                    }}
                  >
                    Download Image
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}