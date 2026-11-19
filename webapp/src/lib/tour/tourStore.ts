import { useSyncExternalStore } from 'react';

interface TourState {
  /** Id of the running tour, or null when none is running. */
  id: string | null;
  index: number;
}

const DONE_KEY = 'tours-done';

let state: TourState = { id: null, index: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startTour(id: string) {
  state = { id, index: 0 };
  emit();
}

export function setTourStep(index: number) {
  state = { ...state, index };
  emit();
}

export function stopTour() {
  state = { id: null, index: 0 };
  emit();
}

export function useTourState(): TourState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Ids of the tours the user has finished. */
export function getDoneTours(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markTourDone(id: string) {
  try {
    const done = getDoneTours();
    if (!done.includes(id)) localStorage.setItem(DONE_KEY, JSON.stringify([...done, id]));
  } catch {
    /* storage unavailable */
  }
}
