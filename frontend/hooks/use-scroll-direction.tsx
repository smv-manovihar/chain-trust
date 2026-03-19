"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Tracks scroll direction within a scrollable container.
 * Returns `isVisible` — true when scrolling up or at the top, false when scrolling down.
 * Only activates on mobile (< 768px) by default.
 */
export function useScrollDirection(containerRef?: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const update = useCallback(() => {
    // Only activate on mobile
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsVisible(true);
      return;
    }

    const scrollY = containerRef?.current 
      ? containerRef.current.scrollTop 
      : (typeof window !== "undefined" ? window.scrollY : 0);
    
    const delta = scrollY - lastScrollY.current;

    if (Math.abs(delta) < 5) {
      ticking.current = false;
      return;
    }

    if (delta > 0 && scrollY > 60) {
      // Scrolling down & past threshold
      setIsVisible(false);
    } else if (delta < 0) {
      // Scrolling up
      setIsVisible(true);
    }

    lastScrollY.current = scrollY;
    ticking.current = false;
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef?.current;
    const target = el || (typeof window !== "undefined" ? window : null);
    if (!target) return;

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(update);
        ticking.current = true;
      }
    };

    target.addEventListener("scroll", onScroll, { passive: true });

    // Also listen for resize to re-evaluate breakpoint
    const onResize = () => {
      if (window.innerWidth >= 768) setIsVisible(true);
    };
    window.addEventListener("resize", onResize);

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [containerRef, update]);

  return isVisible;
}
