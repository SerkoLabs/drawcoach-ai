/**
 * App-wide state: the learner's profile, active learning path, and progress.
 * Backed by AsyncStorage and exposed through the `useApp()` hook. Image files
 * are managed alongside progress so "delete my artwork" and "delete account"
 * genuinely remove pixels from disk.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getPath } from '@/content/paths';
import type { ProgressMap } from '@/domain/progress';
import { PROGRESS_KEY, type Attempt, type CheckpointProgress, type UserProfile } from '@/domain/types';
import { deleteAllArtworkFiles } from '@/store/media';
import {
  EMPTY_STATE,
  clearState,
  loadState,
  saveState,
  type PersistedState,
} from '@/store/storage';

interface AppContextValue {
  ready: boolean;
  profile: UserProfile | null;
  pathId: string | null;
  progress: ProgressMap;
  onboarded: boolean;

  completeOnboarding: (profile: UserProfile) => void;
  renameProfile: (name: string) => void;
  recordAttempt: (
    lessonId: string,
    checkpointId: string,
    attempt: Attempt,
    opts?: { complete?: boolean },
  ) => void;
  setCheckpointComplete: (lessonId: string, checkpointId: string, complete: boolean) => void;
  deleteAllArtwork: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function ensureEntry(progress: ProgressMap, lessonId: string, checkpointId: string): CheckpointProgress {
  const key = PROGRESS_KEY(lessonId, checkpointId);
  return progress[key] ?? { lessonId, checkpointId, attempts: [], completed: false };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const didLoad = useRef(false);

  useEffect(() => {
    let active = true;
    loadState().then((loaded) => {
      if (!active) return;
      setState(loaded);
      didLoad.current = true;
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change, but only after the initial load has populated state.
  useEffect(() => {
    if (didLoad.current) saveState(state);
  }, [state]);

  const completeOnboarding = useCallback((profile: UserProfile) => {
    setState((prev) => ({ ...prev, profile, pathId: `${profile.category}-${profile.medium}` }));
  }, []);

  const renameProfile = useCallback((name: string) => {
    setState((prev) => (prev.profile ? { ...prev, profile: { ...prev.profile, name } } : prev));
  }, []);

  const recordAttempt = useCallback(
    (lessonId: string, checkpointId: string, attempt: Attempt, opts?: { complete?: boolean }) => {
      setState((prev) => {
        const key = PROGRESS_KEY(lessonId, checkpointId);
        const entry = ensureEntry(prev.progress, lessonId, checkpointId);
        const nextEntry: CheckpointProgress = {
          ...entry,
          attempts: [...entry.attempts, attempt],
        };
        if (opts?.complete) {
          nextEntry.completed = true;
          nextEntry.completedAt = Date.now();
        }
        return { ...prev, progress: { ...prev.progress, [key]: nextEntry } };
      });
    },
    [],
  );

  const setCheckpointComplete = useCallback(
    (lessonId: string, checkpointId: string, complete: boolean) => {
      setState((prev) => {
        const key = PROGRESS_KEY(lessonId, checkpointId);
        const entry = ensureEntry(prev.progress, lessonId, checkpointId);
        return {
          ...prev,
          progress: {
            ...prev.progress,
            [key]: {
              ...entry,
              completed: complete,
              completedAt: complete ? (entry.completedAt ?? Date.now()) : undefined,
            },
          },
        };
      });
    },
    [],
  );

  const deleteAllArtwork = useCallback(async () => {
    await deleteAllArtworkFiles();
    setState((prev) => {
      const progress: ProgressMap = {};
      for (const [key, entry] of Object.entries(prev.progress)) {
        // Keep completion (progress the learner earned) but drop the images.
        progress[key] = { ...entry, attempts: [] };
      }
      return { ...prev, progress };
    });
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAllArtworkFiles();
    await clearState();
    setState(EMPTY_STATE);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      profile: state.profile,
      pathId: state.pathId,
      progress: state.progress,
      onboarded: state.profile != null && getPath(state.pathId) != null,
      completeOnboarding,
      renameProfile,
      recordAttempt,
      setCheckpointComplete,
      deleteAllArtwork,
      deleteAccount,
    }),
    [
      ready,
      state,
      completeOnboarding,
      renameProfile,
      recordAttempt,
      setCheckpointComplete,
      deleteAllArtwork,
      deleteAccount,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
