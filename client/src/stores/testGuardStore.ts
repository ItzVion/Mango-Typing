import { create } from "zustand";

// Tracks whether the person is mid-test (has started typing but not
// finished/cancelled yet). The navbar reads this to intercept navigation
// and confirm before letting them lose progress.
interface TestGuardState {
  testInProgress: boolean;
  setTestInProgress: (value: boolean) => void;
}

export const useTestGuardStore = create<TestGuardState>((set) => ({
  testInProgress: false,
  setTestInProgress: (value) => set({ testInProgress: value }),
}));
