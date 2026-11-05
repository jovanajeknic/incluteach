import { useCallback, useState } from 'react';
import {
  defaultPreferences,
  parseStoredPreferences,
  type ReadingPreferences,
} from './readingPreferences';

const storageKey = (userId: string) => `incluteach.reading.${userId}`;

// Storage can be unavailable (private mode, blocked cookies); the settings then simply
// last for the current visit.
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Ignore: see readStored.
  }
}

/**
 * Display settings of one person on this device. They are remembered locally and never sent
 * to the server; only display settings are stored, never personal data.
 */
export function useReadingPreferences(userId: string) {
  const key = storageKey(userId);
  const [preferences, setPreferences] = useState<ReadingPreferences>(() =>
    parseStoredPreferences(readStored(key), defaultPreferences()),
  );

  const update = useCallback(
    <K extends keyof ReadingPreferences>(field: K, value: ReadingPreferences[K]) => {
      setPreferences((current) => {
        const next = { ...current, [field]: value };
        writeStored(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    writeStored(key, null);
    setPreferences(defaultPreferences());
  }, [key]);

  return { preferences, update, reset };
}
