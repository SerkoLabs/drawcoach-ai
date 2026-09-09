/**
 * AsyncStorage persistence for the learner's private data: profile, active
 * path and per-checkpoint progress. Everything lives on-device; nothing is
 * uploaded except the images the learner explicitly submits for critique.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CheckpointProgress, UserProfile } from '@/domain/types';

const STORAGE_KEY = 'drawcoach.state.v1';

export interface PersistedState {
  version: 1;
  profile: UserProfile | null;
  pathId: string | null;
  progress: Record<string, CheckpointProgress>;
}

export const EMPTY_STATE: PersistedState = {
  version: 1,
  profile: null,
  pathId: null,
  progress: {},
};

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || parsed.version !== 1) return EMPTY_STATE;
    return {
      version: 1,
      profile: parsed.profile ?? null,
      pathId: parsed.pathId ?? null,
      progress: parsed.progress ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best effort — a failed write should never crash the app
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // best effort
  }
}
