"use client";

import { useSidebar } from "@/contexts/sidebar-context";
import { Header } from "@/components/header";
import { useSwipeable } from "react-swipeable";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, setIsMobileOpen } = useSidebar();
  
  // Swipe handlers to open sidebar from left edge
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      // Only trigger if swipe starts from left edge (first 20px)
      setIsMobileOpen(true);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: false,
  });
  
  return (
    <div 
      {...swipeHandlers}
      className={`transition-all duration-300 h-screen md:min-h-screen flex flex-col overflow-hidden md:overflow-visible ${
        isCollapsed ? 'md:ml-[60px]' : 'md:ml-[280px]'
      }`}
    >
      <Header />
      <main className="w-full px-4 py-2 md:py-8 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}