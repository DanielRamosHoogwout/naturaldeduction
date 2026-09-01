/**
 * Player progress: which levels are finished, and how the player got there.
 *
 * Persisted through AsyncStorage rather than a server — progress is a few
 * kilobytes and there is nothing here worth an account for. Entitlements are a
 * separate concern and live with RevenueCat, which syncs them across devices.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { LEVELS } from '../levels/levels';

const STORAGE_KEY = 'nd.progress.v1';

export interface LevelRecord {
  /** Lines in the shortest proof the player has submitted for this level. */
  bestLength: number;
  usedHint: boolean;
  completedAt: number;
}

interface ProgressState {
  records: Record<string, LevelRecord>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  complete: (levelId: string, lineCount: number, usedHint: boolean) => void;
  markHintUsed: (levelId: string) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>((set, get) => ({
  records: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ records: raw ? JSON.parse(raw) : {}, hydrated: true });
    } catch {
      // A corrupt or unreadable store should cost the player their history,
      // not the ability to open the app.
      set({ records: {}, hydrated: true });
    }
  },

  complete: (levelId, lineCount, usedHint) => {
    const existing = get().records[levelId];
    const record: LevelRecord = {
      bestLength: existing ? Math.min(existing.bestLength, lineCount) : lineCount,
      usedHint: (existing?.usedHint ?? false) || usedHint,
      completedAt: existing?.completedAt ?? Date.now(),
    };
    persist({ ...get().records, [levelId]: record }, set);
  },

  markHintUsed: (levelId) => {
    const records = get().records;
    const existing = records[levelId];
    if (!existing) return;
    persist({ ...records, [levelId]: { ...existing, usedHint: true } }, set);
  },

  reset: () => persist({}, set),
}));

function persist(records: Record<string, LevelRecord>, set: (partial: Partial<ProgressState>) => void) {
  set({ records });
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records)).catch(() => {
    // Best effort: an unwritable store must never interrupt play.
  });
}

/** A level is playable once the level before it is done; the first is always open. */
export function isUnlocked(levelId: string, records: Record<string, LevelRecord>): boolean {
  const level = LEVELS.find((entry) => entry.id === levelId);
  if (!level || level.index === 1) return true;
  const previous = LEVELS[level.index - 2];
  return Boolean(records[previous.id]);
}

export function chapterProgress(chapterId: string, records: Record<string, LevelRecord>) {
  const levels = LEVELS.filter((level) => level.chapterId === chapterId);
  const done = levels.filter((level) => records[level.id]).length;
  return { done, total: levels.length };
}
