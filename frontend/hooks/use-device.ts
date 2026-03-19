"use client";

import { useEffect, useState } from "react";

/**
 * Detects actual mobile devices using userAgent + touch capability.
 * Does NOT rely on window width — a narrow browser window on a desktop
 * is not a mobile device.
 */
export function useDevice() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasCameraAPI, setHasCameraAPI] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;

    // True mobile OS check
    const mobileOS = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|BlackBerry|webOS/i.test(ua);
    // iPadOS 13+ reports as "MacIntel" but has touch
    const iPadOS = /MacIntel/.test(navigator.platform) && navigator.maxTouchPoints > 1;

    const mobile = mobileOS || iPadOS;
    const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const camera = !!navigator.mediaDevices?.getUserMedia;

    setIsMobileDevice(mobile);
    setIsTouchDevice(touch);
    setHasCameraAPI(camera);
  }, []);

  return { isMobileDevice, isTouchDevice, hasCameraAPI };
}