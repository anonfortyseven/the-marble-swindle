// Data loader for The Marble Swindle
// Imports all game data (rooms, items, dialogues) and exports loaders

import { RoomDefinition, ItemDefinition } from '@/types/game';
import { DialogueFile } from '@/types/dialogue';
import { loadDialogueFile } from '@/engine/DialogueLoader';

// ============================================
// ROOM DATA
// ============================================

// Import room JSON files
import sinkholeRoom from './rooms/sinkhole.json';
import generalStoreRoom from './rooms/general_store.json';
import cathedralRoom from './rooms/cathedral_room.json';
import springRoom from './rooms/spring_room.json';
import assayOfficeRoom from './rooms/assay_office.json';
import townSquareRoom from './rooms/town_square.json';
import saloonRoom from './rooms/saloon.json';
import lynchHomesteadRoom from './rooms/lynch_homestead.json';

// Room registry
const roomRegistry: Map<string, RoomDefinition> = new Map();

/**
 * Get a room definition by ID
 */
export function getRoom(roomId: string): RoomDefinition | undefined {
  return roomRegistry.get(roomId);
}

/**
 * Get all room IDs
 */
export function getAllRoomIds(): string[] {
  return Array.from(roomRegistry.keys());
}

/**
 * Get all rooms
 */
export function getAllRooms(): RoomDefinition[] {
  return Array.from(roomRegistry.values());
}

// ============================================
// ITEM DATA
// ============================================

import itemsData from './items/items.json';

// Item registry
const itemRegistry: Map<string, ItemDefinition> = new Map();

/**
 * Get an item definition by ID
 */
export function getItem(itemId: string): ItemDefinition | undefined {
  return itemRegistry.get(itemId);
}

/**
 * Get all item IDs
 */
export function getAllItemIds(): string[] {
  return Array.from(itemRegistry.keys());
}

/**
 * Get all items
 */
export function getAllItems(): ItemDefinition[] {
  return Array.from(itemRegistry.values());
}

// ============================================
// DIALOGUE DATA
// ============================================

// Import dialogue JSON files
import maybelleDialogue from './dialogue/maybelle.json';
import lynchDialogue from './dialogue/lynch.json';
import powellDialogue from './dialogue/powell.json';
import osageElderDialogue from './dialogue/osage_elder.json';
import assayClerkDialogue from './dialogue/assay_clerk.json';
import bartenderDialogue from './dialogue/bartender.json';
import drunkMinerDialogue from './dialogue/drunk_miner.json';
import genevieveDialogue from './dialogue/genevieve.json';

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;

/**
 * Initialize all game data
 * Call this once at game start
 */
export function initializeGameData(): void {
  if (isInitialized) {
    console.warn('Game data already initialized');
    return;
  }

  console.log('Initializing game data...');

  // Load rooms
  const rooms = [
    sinkholeRoom,
    generalStoreRoom,
    cathedralRoom,
    springRoom,
    assayOfficeRoom,
    townSquareRoom,
    saloonRoom,
    lynchHomesteadRoom,
  ];

  for (const room of rooms) {
    roomRegistry.set(room.id, room as RoomDefinition);
  }
  console.log(`Loaded ${rooms.length} rooms`);

  // Load items
  for (const item of itemsData.items) {
    itemRegistry.set(item.id, item as ItemDefinition);
  }
  console.log(`Loaded ${itemsData.items.length} items`);

  // Load dialogues
  const dialogues = [
    maybelleDialogue,
    lynchDialogue,
    powellDialogue,
    osageElderDialogue,
    assayClerkDialogue,
    bartenderDialogue,
    drunkMinerDialogue,
    genevieveDialogue,
  ];

  for (const dialogue of dialogues) {
    loadDialogueFile(dialogue as DialogueFile);
  }
  console.log(`Loaded ${dialogues.length} dialogue files`);

  isInitialized = true;
  console.log('Game data initialization complete');
}

/**
 * Check if game data is initialized
 */
export function isGameDataInitialized(): boolean {
  return isInitialized;
}

// ============================================
// PUZZLE TRACKING
// ============================================

/**
 * The three main puzzle objectives
 */
export const PUZZLE_OBJECTIVES = {
  EXPOSE_MARBLE_FRAUD: 'expose_marble_fraud',
  SECURE_CAVE_RIGHTS: 'secure_cave_rights',
  WIN_TOWN_SUPPORT: 'win_town_support',
} as const;

/**
 * Sub-puzzles that contribute to the main objectives
 */
export const SUB_PUZZLES = {
  // Expose Marble Fraud chain
  FIX_PULLEY: 'fix_pulley',
  GET_ROCK_SAMPLE: 'get_rock_sample',
  GET_OFFICIAL_ASSAY: 'get_official_assay',
  FIND_POWELL_RECORDS: 'find_powell_records',

  // Secure Cave Rights chain
  FIND_CORNELIUS_LETTER: 'find_cornelius_letter',
  FIND_CORNELIUS_NOTES: 'find_cornelius_notes',
  FIND_ORIGINAL_DEED: 'find_original_deed',
  UNDERSTAND_RIGHTS: 'understand_rights',

  // Win Town Support chain
  MEET_TOWNSPEOPLE: 'meet_townspeople',
  BARTENDER_ALLIANCE: 'bartender_alliance',
  PUBLIC_EXPOSURE: 'public_exposure',
} as const;

/**
 * Check which objectives are complete
 */
export function checkObjectiveProgress(): {
  exposeFraud: boolean;
  secureRights: boolean;
  winSupport: boolean;
  allComplete: boolean;
} {
  // This would check game state for puzzle completion
  // Placeholder implementation - actual check happens in GameState
  return {
    exposeFraud: false,
    secureRights: false,
    winSupport: false,
    allComplete: false,
  };
}

// ============================================
// GAME FLOW HELPERS
// ============================================

/**
 * Get the starting room ID
 */
export function getStartingRoom(): string {
  return 'sinkhole';
}

/**
 * Get rooms adjacent to a given room
 */
export function getAdjacentRooms(roomId: string): string[] {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.exits.map((exit) => exit.targetRoom);
}

/**
 * Get the item the player starts with
 */
export function getStartingItems(): string[] {
  return ['lantern', 'journal'];
}
