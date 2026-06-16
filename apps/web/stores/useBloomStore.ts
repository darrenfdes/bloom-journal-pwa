import { create } from 'zustand';

import type { EntryRecord, GardenFilter, GardenMeta, WriteDraft } from '@bloom/core';

const emptyDraft: WriteDraft = {
  title: '',
  content: '',
  mood: null,
  tags: [],
  createdAtOverride: null,
  revisitOf: null,
};

interface BloomState {
  ready: boolean;
  gardenMeta: GardenMeta | null;
  entries: EntryRecord[];
  draft: WriteDraft;
  pendingPlant: WriteDraft | null;
  gardenFilter: GardenFilter;
  highlightEntryId: string | null;
  quickWriteOpen: boolean;
  memoryCardOpen: boolean;
  setReady: (ready: boolean) => void;
  setGardenMeta: (meta: GardenMeta) => void;
  setEntries: (entries: EntryRecord[]) => void;
  setDraft: (draft: Partial<WriteDraft>) => void;
  resetDraft: (base?: Partial<WriteDraft>) => void;
  setPendingPlant: (draft: WriteDraft | null) => void;
  setGardenFilter: (filter: GardenFilter) => void;
  setHighlightEntryId: (id: string | null) => void;
  setQuickWriteOpen: (open: boolean) => void;
  setMemoryCardOpen: (open: boolean) => void;
  refreshEntries: () => Promise<void>;
}

export const useBloomStore = create<BloomState>((set, get) => ({
  ready: false,
  gardenMeta: null,
  entries: [],
  draft: { ...emptyDraft },
  pendingPlant: null,
  gardenFilter: { type: 'all' },
  highlightEntryId: null,
  quickWriteOpen: false,
  memoryCardOpen: false,
  setReady: (ready) => set({ ready }),
  setGardenMeta: (gardenMeta) => set({ gardenMeta }),
  setEntries: (entries) => set({ entries }),
  setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
  resetDraft: (base) => set({ draft: { ...emptyDraft, ...base } }),
  setPendingPlant: (pendingPlant) => set({ pendingPlant }),
  setGardenFilter: (gardenFilter) => set({ gardenFilter }),
  setHighlightEntryId: (highlightEntryId) => set({ highlightEntryId }),
  setQuickWriteOpen: (quickWriteOpen) => set({ quickWriteOpen }),
  setMemoryCardOpen: (memoryCardOpen) => set({ memoryCardOpen }),
  refreshEntries: async () => {
    const { listEntries } = await import('@/lib/db/repositories/entries');
    const entries = await listEntries();
    set({ entries });
  },
}));
