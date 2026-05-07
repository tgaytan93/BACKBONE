'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UsePersistentStateOptions<T> {
  defaultValue: T;
  storageKey: string;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * Persisted state hook backed by sessionStorage. Per-tab scoping prevents
 * impersonation/view-as state from leaking between sessions or contexts.
 */
export function usePersistentState<T>({
  defaultValue,
  storageKey,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: UsePersistentStateOptions<T>) {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = deserialize(stored);
        setState(parsed);
      }
    } catch (error) {
      console.warn(
        `Failed to load persisted state for key "${storageKey}":`,
        error
      );
      sessionStorage.removeItem(storageKey);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, deserialize]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const serialized = serialize(state);
      sessionStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.warn(`Failed to save state for key "${storageKey}":`, error);
    }
  }, [state, storageKey, serialize, isLoaded]);

  const updateState = useCallback((newValue: T | ((prevValue: T) => T)) => {
    setState(newValue);
  }, []);

  const clearState = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setState(defaultValue);
  }, [storageKey, defaultValue]);

  return {
    state,
    setState: updateState,
    clearState,
    isLoaded,
  };
}

interface AdminPageState {
  filters: Record<string, unknown>;
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

/**
 * Pre-shaped persistent state for admin list pages: filters, search,
 * pagination, and sort. Filter or search updates auto-reset to page 1.
 */
export function useAdminPageState(pageKey: string) {
  const defaultState: AdminPageState = {
    filters: {},
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 20,
    sortField: '',
    sortDirection: 'asc',
  };

  const { state, setState, clearState, isLoaded } =
    usePersistentState<AdminPageState>({
      defaultValue: defaultState,
      storageKey: `admin-${pageKey}-state`,
    });

  const updateFilters = useCallback(
    (filters: Record<string, unknown>) => {
      setState((prev) => ({
        ...prev,
        filters,
        currentPage: 1,
      }));
    },
    [setState]
  );

  const updateSearch = useCallback(
    (searchTerm: string) => {
      setState((prev) => ({
        ...prev,
        searchTerm,
        currentPage: 1,
      }));
    },
    [setState]
  );

  const updatePagination = useCallback(
    (currentPage: number, itemsPerPage?: number) => {
      setState((prev) => ({
        ...prev,
        currentPage,
        ...(itemsPerPage !== undefined && { itemsPerPage }),
      }));
    },
    [setState]
  );

  const updateSort = useCallback(
    (sortField: string, sortDirection: 'asc' | 'desc') => {
      setState((prev) => ({
        ...prev,
        sortField,
        sortDirection,
      }));
    },
    [setState]
  );

  const resetState = useCallback(() => {
    clearState();
  }, [clearState]);

  return {
    ...state,
    updateFilters,
    updateSearch,
    updatePagination,
    updateSort,
    resetState,
    isLoaded,
  };
}
