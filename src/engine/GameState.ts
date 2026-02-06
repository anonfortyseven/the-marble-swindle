// Global game state management
// The Marble Swindle - Engine Module

import { GameState, SaveData, RoomState, Point } from '@/types/game';

const SAVE_VERSION = '1.0.0';
const STORAGE_KEY = 'marble-swindle-saves';

// Initial game state
export function createInitialState(): GameState {
  return {
    currentRoom: 'sinkhole',
    playerPosition: { x: 480, y: 450 },
    playerFacing: 'right',
    inventory: [],
    flags: {},
    visitedRooms: [],
    solvedPuzzles: [],
    reputation: 0,
    dialogueHistory: [],
    selectedChoices: [],
    roomStates: {},
  };
}

// Game state singleton
let gameState: GameState = createInitialState();

// Getters
export function getGameState(): GameState {
  return gameState;
}

export function getCurrentRoom(): string {
  return gameState.currentRoom;
}

export function getPlayerPosition(): Point {
  return { ...gameState.playerPosition };
}

export function getPlayerFacing(): 'left' | 'right' {
  return gameState.playerFacing;
}

export function getInventory(): string[] {
  return [...gameState.inventory];
}

export function hasItem(itemId: string): boolean {
  return gameState.inventory.includes(itemId);
}

export function getFlag<T extends boolean | number | string>(
  flag: string,
  defaultValue?: T
): T | undefined {
  const value = gameState.flags[flag];
  if (value === undefined) return defaultValue;
  return value as T;
}

export function getReputation(): number {
  return gameState.reputation;
}

export function hasVisitedRoom(roomId: string): boolean {
  return gameState.visitedRooms.includes(roomId);
}

export function hasSolvedPuzzle(puzzleId: string): boolean {
  return gameState.solvedPuzzles.includes(puzzleId);
}

export function hasSelectedChoice(choiceId: string): boolean {
  return gameState.selectedChoices.includes(choiceId);
}

export function getRoomState(roomId: string): RoomState {
  return gameState.roomStates[roomId] || {
    disabledHotspots: [],
    removedCharacters: [],
    customFlags: {},
  };
}

// Setters
export function setCurrentRoom(roomId: string): void {
  gameState.currentRoom = roomId;
  if (!gameState.visitedRooms.includes(roomId)) {
    gameState.visitedRooms.push(roomId);
  }
}

export function setPlayerPosition(position: Point): void {
  gameState.playerPosition = { ...position };
}

export function setPlayerFacing(facing: 'left' | 'right'): void {
  gameState.playerFacing = facing;
}

export function addItem(itemId: string): void {
  if (!gameState.inventory.includes(itemId)) {
    gameState.inventory.push(itemId);
  }
}

export function removeItem(itemId: string): void {
  gameState.inventory = gameState.inventory.filter((id) => id !== itemId);
}

export function setFlag(
  flag: string,
  value: boolean | number | string
): void {
  gameState.flags[flag] = value;
}

export function incrementFlag(flag: string, amount: number = 1): void {
  const current = gameState.flags[flag];
  if (typeof current === 'number') {
    gameState.flags[flag] = current + amount;
  } else {
    gameState.flags[flag] = amount;
  }
}

export function setReputation(value: number): void {
  gameState.reputation = Math.max(-100, Math.min(100, value));
}

export function adjustReputation(amount: number): void {
  setReputation(gameState.reputation + amount);
}

export function markPuzzleSolved(puzzleId: string): void {
  if (!gameState.solvedPuzzles.includes(puzzleId)) {
    gameState.solvedPuzzles.push(puzzleId);
  }
}

export function recordDialogueVisit(nodeId: string): void {
  if (!gameState.dialogueHistory.includes(nodeId)) {
    gameState.dialogueHistory.push(nodeId);
  }
}

export function recordChoiceSelection(choiceId: string): void {
  if (!gameState.selectedChoices.includes(choiceId)) {
    gameState.selectedChoices.push(choiceId);
  }
}

export function setHotspotEnabled(
  roomId: string,
  hotspotId: string,
  enabled: boolean
): void {
  const roomState = ensureRoomState(roomId);
  
  if (enabled) {
    roomState.disabledHotspots = roomState.disabledHotspots.filter(
      (id) => id !== hotspotId
    );
  } else {
    if (!roomState.disabledHotspots.includes(hotspotId)) {
      roomState.disabledHotspots.push(hotspotId);
    }
  }
}

export function isHotspotEnabled(roomId: string, hotspotId: string): boolean {
  const roomState = getRoomState(roomId);
  return !roomState.disabledHotspots.includes(hotspotId);
}

function ensureRoomState(roomId: string): RoomState {
  if (!gameState.roomStates[roomId]) {
    gameState.roomStates[roomId] = {
      disabledHotspots: [],
      removedCharacters: [],
      customFlags: {},
    };
  }
  return gameState.roomStates[roomId];
}

// Reset game
export function resetGame(): void {
  gameState = createInitialState();
}

// Load state
export function loadState(state: GameState): void {
  gameState = { ...state };
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

export function saveGame(slot: number, slotName?: string): boolean {
  try {
    const saves = getSaveSlots();
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      slotName: slotName || `Save ${slot}`,
      gameState: { ...gameState },
    };

    saves[slot] = saveData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(slot: number): boolean {
  try {
    const saves = getSaveSlots();
    const saveData = saves[slot];

    if (!saveData) {
      console.warn(`No save found in slot ${slot}`);
      return false;
    }

    // Version migration could happen here
    gameState = { ...saveData.gameState };
    return true;
  } catch (error) {
    console.error('Failed to load game:', error);
    return false;
  }
}

export function getSaveSlots(): { [slot: number]: SaveData } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function deleteSave(slot: number): boolean {
  try {
    const saves = getSaveSlots();
    delete saves[slot];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
}

// ============================================
// CONDITION EVALUATION
// ============================================

export function evaluateCondition(condition: string): boolean {
  if (!condition || condition.trim() === '') return true;

  // Simple expression evaluator
  // Supports: hasItem('id'), getFlag('id'), reputation > 10, &&, ||, !, ()
  try {
    // Create a safe evaluation context
    const context: Record<string, unknown> = {
      hasItem,
      getFlag,
      hasVisitedRoom,
      hasSolvedPuzzle,
      reputation: gameState.reputation,
      inventory: gameState.inventory,
    };

    // Build evaluation function
    const evalFunc = new Function(
      ...Object.keys(context),
      `return ${condition};`
    );

    return !!evalFunc(...Object.values(context));
  } catch (error) {
    console.error(`Failed to evaluate condition: ${condition}`, error);
    return false;
  }
}

// ============================================
// STATE CHANGE EVENTS
// ============================================

type StateChangeListener = (state: GameState) => void;
const listeners: StateChangeListener[] = [];

export function subscribeToStateChanges(listener: StateChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function notifyStateChange(): void {
  for (const listener of listeners) {
    listener(gameState);
  }
}
