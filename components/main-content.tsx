"use client";

import { useSidebar } from "@/contexts/sidebar-context";
import { Header } from "@/components/header";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div 
      className={`transition-all duration-300 min-h-screen flex flex-col overflow-x-hidden ${
        isCollapsed ? 'md:ml-[60px]' : 'md:ml-[280px]'
      }`}
    >
      <Header />
      <main className="w-full px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}