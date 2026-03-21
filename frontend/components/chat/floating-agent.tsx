"use client";

import { useState } from "react";
import { Sparkles, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentChat } from "./agent-chat";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";

export function FloatingAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show if not logged in or on dedicated agent pages
  if (!isAuthenticated || !user || pathname.includes("/agent")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[380px] h-[600px] max-h-[85vh] shadow-2xl rounded-2xl overflow-hidden border bg-background"
          >
            <AgentChat compact={true} />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group",
          isOpen ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
}
