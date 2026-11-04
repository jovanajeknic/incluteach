import { useCallback, useState } from 'react';
import {
  parseStoredPreferences,
  presetPreferences,
  type ReadingPreferences,
  type ReadingPreset,
} from './readingPreferences';

const storageKey = (studentId: string) => `incluteach.reading.${studentId}`;

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
 * Reading preferences for one student on this device. Starts from the student's preset and
 * remembers any change locally. Only display settings are stored, never personal data.
 */
export function useReadingPreferences(studentId: string, preset: ReadingPreset) {
  const key = storageKey(studentId);
  const [preferences, setPreferences] = useState<ReadingPreferences>(() =>
    parseStoredPreferences(readStored(key), presetPreferences(preset)),
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
    setPreferences(presetPreferences(preset));
  }, [key, preset]);

  return { preferences, update, reset };
}
