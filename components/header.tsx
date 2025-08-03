"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LogIn, ChevronDown, Menu, User, LogOut, Zap, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAuth } from "@/contexts/simple-auth-context";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGuestId } from "@/hooks/use-guest-id";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [generationLimits, setGenerationLimits] = useState<{
    used: number;
    limit: number;
    remaining: number;
    isGuest: boolean;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const guestId = useGuestId();

  const navigation = [
    { name: "Generate", href: "/" },
    { name: "Enhance", href: "/enhance" },
    { name: "Gallery", href: "/gallery" },
    { name: "About", href: "/about" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch generation limits
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const params = new URLSearchParams();
        if (guestId && !user) {
          params.append('guestId', guestId);
        }
        
        const response = await fetch(`/api/chat-history?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setGenerationLimits(data.limits);
        }
      } catch (error) {
        console.error('Failed to fetch limits:', error);
      }
    };
    
    fetchLimits();
  }, [user, guestId]);

  return (
    <header className="sticky top-0 z-30 w-full">
      <nav className="w-full px-2 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Sidebar toggle for mobile */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={`md:hidden p-1.5 transition-all duration-300 ${isMobileOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
              style={{ pointerEvents: isMobileOpen ? 'none' : 'auto' }}
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Toggle sidebar</span>
            </button>
            
            <div className="relative flex items-center gap-1" ref={dropdownRef}>
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold gradient-text font-space-grotesk tracking-wider">Triniva AI</span>
            </Link>
            
            {/* Dropdown Button */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              aria-label="Open menu"
            >
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-card border border-border shadow-lg overflow-hidden"
                >
                  <div className="p-1.5">
                    {navigation.map((item, index) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Generation Limits Dropdown */}
            {generationLimits && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {generationLimits.remaining}/{generationLimits.limit}
                    </span>
                    <span className="md:hidden text-xs">
                      {generationLimits.remaining}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      <h3 className="font-semibold">Generation Limits</h3>
                    </div>
                    
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {generationLimits.isGuest ? "Guest Account" : "Free Plan"}
                        </span>
                        <span className="text-muted-foreground">
                          {generationLimits.used} / {generationLimits.limit} used
                        </span>
                      </div>
                      <Progress 
                        value={(generationLimits.used / generationLimits.limit) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {generationLimits.remaining} generations remaining
                      </p>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Content based on user type */}
                    {generationLimits.isGuest ? (
                      <>
                        <div className="space-y-3">
                          <div className="text-sm space-y-1">
                            <p className="font-medium">Guest Limitations</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              <li>• 3 free image generations</li>
                              <li>• Images saved for 30 days</li>
                              <li>• Limited to basic features</li>
                            </ul>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <p className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Sign In for More
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              <li>• 10 free generations</li>
                              <li>• Permanent image storage</li>
                              <li>• Access to all features</li>
                            </ul>
                          </div>
                        </div>
                        
                        <DropdownMenuSeparator />
                        
                        <Button 
                          size="sm" 
                          className="w-full text-white"
                          onClick={() => setAuthModalOpen(true)}
                        >
                          Sign In Now
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="text-sm space-y-1">
                            <p className="font-medium">Free Plan Features</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              <li>• 10 lifetime free generations</li>
                              <li>• Permanent image storage</li>
                              <li>• Access to all models</li>
                            </ul>
                          </div>
                          
                          {generationLimits.remaining === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="text-sm space-y-1">
                                <p className="font-medium flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  Need More?
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Premium plans coming soon!
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Animated theme toggle for desktop */}
            <ThemeToggle className="hidden md:inline-flex" />
            {/* Animated theme toggle for mobile */}
            <ThemeToggle className="md:hidden" />
            
            {/* User account section */}
            {user ? (
              <>
                {/* Desktop user dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden md:inline-flex"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile user dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Sign in button for desktop */}
                <Button 
                  variant="default" 
                  size="sm" 
                  className="hidden md:inline-flex bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Sign In
                </Button>
                
                {/* Sign in icon for mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setAuthModalOpen(true)}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Sign In</span>
                </Button>
              </>
            )}
          </div>
        </div>

      </nav>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}