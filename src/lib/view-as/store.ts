'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  startViewAs,
  endViewAs,
  setViewAsLocked,
  getActiveViewAsSession,
  type ActiveViewAsSession,
} from '@/app/admin/view-as-actions';

interface ViewAsStore {
  activeSession: ActiveViewAsSession | null;
  isHydrated: boolean;
  isPending: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  startViewAs: (
    targetOrgId: string,
    options?: { locked?: boolean }
  ) => Promise<void>;
  endViewAs: () => Promise<void>;
  setLocked: (locked: boolean) => Promise<void>;
}

export const useViewAsStore = create<ViewAsStore>()(
  devtools(
    (set) => ({
      activeSession: null,
      isHydrated: false,
      isPending: false,
      error: null,

      hydrate: async () => {
        const { session, error } = await getActiveViewAsSession();
        if (error) {
          // Auth failure (not a backbone_admin) just leaves state empty.
          set({ activeSession: null, isHydrated: true, error: null });
          return;
        }
        set({ activeSession: session, isHydrated: true, error: null });
      },

      startViewAs: async (targetOrgId, options) => {
        set({ isPending: true, error: null });
        const res = await startViewAs(targetOrgId, options);
        if (res?.error) {
          set({ isPending: false, error: res.error });
          return;
        }
        set({
          activeSession: res?.session ?? null,
          isPending: false,
          error: null,
        });
      },

      endViewAs: async () => {
        set({ isPending: true, error: null });
        const res = await endViewAs();
        if (res?.error) {
          set({ isPending: false, error: res.error });
          return;
        }
        set({ activeSession: null, isPending: false, error: null });
      },

      setLocked: async (locked) => {
        set({ isPending: true, error: null });
        const res = await setViewAsLocked(locked);
        if (res?.error) {
          set({ isPending: false, error: res.error });
          return;
        }
        set((state) =>
          state.activeSession
            ? {
                activeSession: { ...state.activeSession, isLocked: locked },
                isPending: false,
                error: null,
              }
            : { isPending: false, error: null }
        );
      },
    }),
    { name: 'BackboneViewAs' }
  )
);
