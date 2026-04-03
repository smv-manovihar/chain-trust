import { useEffect, useState } from "react";

/**
 * Custom hook to persist wizard form state in localStorage.
 * Useful for data resilience across browser reloads.
 * 
 * @param key The localStorage key to use
 * @param initialState The initial form state
 * @param options Configuration for persistence
 */
export function useWizardPersistence<T>(
  key: string,
  initialState: T,
  options: {
    excludeFields?: (keyof T)[];
    onLoad?: (data: T) => void;
  } = {}
) {
  const [data, setData] = useState<T>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as T;
        setData(parsed);
        if (options.onLoad) options.onLoad(parsed);
      } catch (err) {
        console.error("Failed to parse wizard persistence data", err);
      }
    }
    setIsLoaded(true);
  }, [key]);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;

    if (data) {
      const toSave = { ...data };
      if (options.excludeFields) {
        options.excludeFields.forEach((field) => {
          delete toSave[field];
        });
      }
      localStorage.setItem(key, JSON.stringify(toSave));
    }
  }, [data, key, isLoaded]);

  const clearPersistence = () => {
    localStorage.removeItem(key);
  };

  return {
    wizardData: data,
    setWizardData: setData,
    clearWizardPersistence: clearPersistence,
    isWizardDataLoaded: isLoaded,
  };
}
