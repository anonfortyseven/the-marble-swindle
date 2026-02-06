'use client';

// React hooks for game state management
// The Marble Swindle - State Hooks

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getGameState,
  getInventory,
  hasItem,
  getFlag,
  getCurrentRoom,
  subscribeToStateChanges,
  addItem,
  removeItem,
  setFlag,
  saveGame,
  loadGame,
  getSaveSlots,
  deleteSave,
  resetGame,
  notifyStateChange,
  SaveData,
  GameState,
} from '@/engine/GameState';

// ============================================
// useGameState - Main game state hook
// ============================================

export function useGameState() {
  const [state, setState] = useState<GameState>(() => getGameState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = subscribeToStateChanges((newState) => {
      setState({ ...newState });
    });

    return unsubscribe;
  }, []);

  return state;
}

// ============================================
// useInventory - Inventory management hook
// ============================================

export function useInventory() {
  const [inventory, setInventoryState] = useState<string[]>(() => getInventory());

  useEffect(() => {
    const unsubscribe = subscribeToStateChanges((state) => {
      setInventoryState([...state.inventory]);
    });

    return unsubscribe;
  }, []);

  const addToInventory = useCallback((itemId: string) => {
    addItem(itemId);
    notifyStateChange();
  }, []);

  const removeFromInventory = useCallback((itemId: string) => {
    removeItem(itemId);
    notifyStateChange();
  }, []);

  const hasItemInInventory = useCallback((itemId: string) => {
    return hasItem(itemId);
  }, []);

  return {
    inventory,
    addItem: addToInventory,
    removeItem: removeFromInventory,
    hasItem: hasItemInInventory,
    itemCount: inventory.length,
  };
}

// ============================================
// useFlags - Game flags management hook
// ============================================

export function useFlags() {
  const state = useGameState();

  const getGameFlag = useCallback(<T extends boolean | number | string>(
    flag: string,
    defaultValue?: T
  ): T | undefined => {
    return getFlag(flag, defaultValue);
  }, []);

  const setGameFlag = useCallback((flag: string, value: boolean | number | string) => {
    setFlag(flag, value);
    notifyStateChange();
  }, []);

  const toggleFlag = useCallback((flag: string) => {
    const current = getFlag<boolean>(flag, false);
    setFlag(flag, !current);
    notifyStateChange();
  }, []);

  const incrementFlagValue = useCallback((flag: string, amount: number = 1) => {
    const current = getFlag<number>(flag, 0);
    setFlag(flag, (current ?? 0) + amount);
    notifyStateChange();
  }, []);

  return {
    flags: state.flags,
    getFlag: getGameFlag,
    setFlag: setGameFlag,
    toggleFlag,
    incrementFlag: incrementFlagValue,
  };
}

// ============================================
// useCurrentRoom - Current room state hook
// ============================================

export function useCurrentRoom() {
  const [room, setRoom] = useState<string>(() => getCurrentRoom());

  useEffect(() => {
    const unsubscribe = subscribeToStateChanges((state) => {
      setRoom(state.currentRoom);
    });

    return unsubscribe;
  }, []);

  return room;
}

// ============================================
// useSaveLoad - Save/Load system hook
// ============================================

export interface SaveSlotInfo {
  slot: number;
  data: SaveData | null;
  isEmpty: boolean;
  formattedDate?: string;
}

export function useSaveLoad() {
  const [saveSlots, setSaveSlots] = useState<{ [slot: number]: SaveData }>(() => getSaveSlots());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refresh save slots
  const refreshSlots = useCallback(() => {
    setSaveSlots(getSaveSlots());
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  // Save to slot
  const save = useCallback(async (slot: number, name?: string): Promise<boolean> => {
    setIsSaving(true);
    setLastError(null);

    try {
      const success = saveGame(slot, name);
      if (success) {
        refreshSlots();
      } else {
        setLastError('Failed to save game');
      }
      return success;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [refreshSlots]);

  // Load from slot
  const load = useCallback(async (slot: number): Promise<boolean> => {
    setIsLoading(true);
    setLastError(null);

    try {
      const success = loadGame(slot);
      if (!success) {
        setLastError('Failed to load game');
      }
      notifyStateChange();
      return success;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete save
  const deleteSlot = useCallback((slot: number): boolean => {
    const success = deleteSave(slot);
    if (success) {
      refreshSlots();
    }
    return success;
  }, [refreshSlots]);

  // Get formatted slot info
  const getSlotInfo = useCallback((slot: number): SaveSlotInfo => {
    const data = saveSlots[slot] || null;
    return {
      slot,
      data,
      isEmpty: !data,
      formattedDate: data
        ? new Date(data.timestamp).toLocaleString()
        : undefined,
    };
  }, [saveSlots]);

  // Get all slots (1-10)
  const allSlots = useMemo((): SaveSlotInfo[] => {
    return Array.from({ length: 10 }, (_, i) => getSlotInfo(i + 1));
  }, [getSlotInfo]);

  // Reset game
  const reset = useCallback(() => {
    resetGame();
    notifyStateChange();
  }, []);

  return {
    saveSlots,
    allSlots,
    save,
    load,
    deleteSlot,
    reset,
    isSaving,
    isLoading,
    lastError,
    refreshSlots,
  };
}

// ============================================
// useDialogueHistory - Dialogue tracking hook
// ============================================

export function useDialogueHistory() {
  const state = useGameState();

  const hasVisitedNode = useCallback((treeId: string, nodeId: string) => {
    return state.dialogueHistory.includes(`${treeId}:${nodeId}`);
  }, [state.dialogueHistory]);

  const hasSelectedChoice = useCallback((treeId: string, choiceId: string) => {
    return state.selectedChoices.includes(`${treeId}:${choiceId}`);
  }, [state.selectedChoices]);

  return {
    dialogueHistory: state.dialogueHistory,
    selectedChoices: state.selectedChoices,
    hasVisitedNode,
    hasSelectedChoice,
  };
}

// ============================================
// usePuzzleProgress - Puzzle tracking hook
// ============================================

export function usePuzzleProgress() {
  const state = useGameState();

  const isSolved = useCallback((puzzleId: string) => {
    return state.solvedPuzzles.includes(puzzleId);
  }, [state.solvedPuzzles]);

  return {
    solvedPuzzles: state.solvedPuzzles,
    isSolved,
    totalSolved: state.solvedPuzzles.length,
  };
}

// ============================================
// useReputation - Reputation tracking hook
// ============================================

export function useReputation() {
  const state = useGameState();

  const reputationLevel = useMemo(() => {
    const rep = state.reputation;
    if (rep >= 75) return 'heroic';
    if (rep >= 50) return 'respected';
    if (rep >= 25) return 'friendly';
    if (rep >= -25) return 'neutral';
    if (rep >= -50) return 'suspicious';
    if (rep >= -75) return 'distrusted';
    return 'villainous';
  }, [state.reputation]);

  return {
    reputation: state.reputation,
    level: reputationLevel,
  };
}

// ============================================
// useAutoSave - Auto-save functionality
// ============================================

export function useAutoSave(enabled: boolean = true, intervalMinutes: number = 5) {
  const { save } = useSaveLoad();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      save(0, 'Autosave'); // Slot 0 for autosave
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, intervalMinutes, save]);
}
