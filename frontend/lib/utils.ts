import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Procedural color generator that derives a consistent, high-contrast
 * HSL color from any string ID (Product ID, Batch Number, etc.)
 */
export function getEntityColor(id: string) {
  if (!id) return "hsl(var(--primary))";
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Deterministic Hue (0-360)
  const h = Math.abs(hash % 360);
  
  // Use high saturation (80%) and balanced lightness (60%) 
  // to ensure visibility against both light and dark backgrounds.
  return `hsl(${h}, 80%, 60%)`;
}
