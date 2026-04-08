import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Manages all scroll behavior for chat interfaces.
 *
 * Auto-scroll contract:
 *  - When `autoScroll` is true, a ResizeObserver keeps the container pinned
 *    to the bottom as content grows (streaming tokens).
 *  - If the user scrolls UP manually, auto-scroll is disabled and the
 *    scroll-to-bottom button appears.
 *  - Per user requirement: Auto-scroll ONLY re-enables when the user clicks
 *    the "Scroll to Bottom" button. Manual scrolling to the bottom hides the
 *    button but does NOT re-enable the pinned auto-scroll mode.
 *  - Calling `scrollToBottom()` re-enables auto-scroll. Use `{ behavior: 'auto' }`
 *    for instant snapping (on send/retry) or `{ behavior: 'smooth' }` for the button.
 */
export function useChatScroll(sessionId?: string | null) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Whether we should be pinned to the bottom as content grows.
  const autoScrollRef = useRef(true);
  // Prevents the scroll listener from cancelling auto-scroll during programmatic scrolls.
  const isProgrammaticRef = useRef(false);
  // Tracks the last known scrollTop to detect direction (scroll-up vs growth).
  const lastScrollTopRef = useRef(0);

  // ─── ResizeObserver: follow content growth while autoScrollRef is true ───
  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => {
      // If auto-scroll is off, we do nothing.
      if (!autoScrollRef.current) return;

      isProgrammaticRef.current = true;
      root.scrollTop = root.scrollHeight;
      lastScrollTopRef.current = root.scrollTop;
      
      requestAnimationFrame(() => {
        isProgrammaticRef.current = false;
      });
    });

    // The keyed content div is the first child of the scroll container.
    const content = root.firstElementChild;
    if (content) observer.observe(content);

    return () => observer.disconnect();
    // Re-attach whenever the session changes — the content div is remounted with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── Scroll listener: cancel auto-scroll on manual scroll-up ────────────
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement> | Event) => {
    const root = scrollContainerRef.current;
    if (!root || isProgrammaticRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = root;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 50; // Tighter threshold for button visibility

    // DIRECTIONAL DETECTION:
    // Only kill auto-scroll if the user actually scrolls UP.
    // Growth causes scrollHeight to increase while scrollTop stays same,
    // which shouldn't be treated as a manual "unscroll".
    if (scrollTop < lastScrollTopRef.current) {
      autoScrollRef.current = false;
      setShowScrollButton(true);
    } else if (atBottom) {
      // If we are at the bottom, hide the scroll button.
      // But we DON'T re-enable autoScrollRef.current automatically;
      // it stays false until re-engaged via scrollToBottom().
      setShowScrollButton(false);
    } else if (!autoScrollRef.current) {
      // If we aren't at the bottom and auto-scroll is off, show the button.
      setShowScrollButton(true);
    }

    lastScrollTopRef.current = scrollTop;
  }, []);

  // ─── scrollToBottom: snap or smooth scroll + re-enable auto-scroll ─────
  const scrollToBottom = useCallback((options?: { behavior?: ScrollBehavior }) => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const behavior = options?.behavior ?? "smooth";

    autoScrollRef.current = true;
    isProgrammaticRef.current = true;
    
    if (behavior === "auto") {
      root.scrollTop = root.scrollHeight;
    } else {
      root.scrollTo({ top: root.scrollHeight, behavior });
    }
    
    lastScrollTopRef.current = root.scrollHeight;
    setShowScrollButton(false);
    
    // Clear programmatic flag after a short delay
    const delay = behavior === "smooth" ? 500 : 50;
    setTimeout(() => {
      isProgrammaticRef.current = false;
    }, delay);
  }, []);

  return {
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
    showScrollButton,
  };
}
