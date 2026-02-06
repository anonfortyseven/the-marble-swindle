// Engine module exports
// The Marble Swindle

// Core game scene
export { GameScene } from './GameScene';

// Pathfinding
export {
  findPath,
  isPointInPolygon,
  getClosestPointInPolygon,
  canWalkDirectly,
  distance,
  getDirection,
  interpolatePath,
  getPathLength,
} from './pathfinding';

// Game state management
export {
  // State getters
  getGameState,
  getCurrentRoom,
  getPlayerPosition,
  getPlayerFacing,
  getInventory,
  hasItem,
  getFlag,
  getReputation,
  hasVisitedRoom,
  hasSolvedPuzzle,
  hasSelectedChoice,
  getRoomState,
  isHotspotEnabled,
  evaluateCondition,
  
  // State setters
  setCurrentRoom,
  setPlayerPosition,
  setPlayerFacing,
  addItem,
  removeItem,
  setFlag,
  incrementFlag,
  setReputation,
  adjustReputation,
  markPuzzleSolved,
  recordDialogueVisit,
  recordChoiceSelection,
  setHotspotEnabled,
  
  // State management
  createInitialState,
  resetGame,
  loadState,
  
  // Save/Load
  saveGame,
  loadGame,
  getSaveSlots,
  deleteSave,
  
  // Events
  subscribeToStateChanges,
  notifyStateChange,
} from './GameState';

// Script execution
export {
  runScript,
  runScriptWithContext,
  getIsRunningScript,
  addScriptEventListener,
  signalDialogueDismissed,
  signalDialogueComplete,
  signalWalkComplete,
} from './ScriptRunner';

// Dialogue management
export {
  registerDialogueTree,
  getDialogueTree,
  startDialogue,
  selectChoice,
  advanceDialogue,
  getIsDialogueActive,
  getCurrentDialogueNode,
  getCurrentDialogueTree,
  addDialogueEventListener,
  createDialogueBuilder,
  createSampleDialogueTrees,
} from './DialogueManager';

// Re-export types
export type {
  Point,
  Polygon,
  RoomDefinition,
  RoomExit,
  Hotspot,
  RoomCharacter,
  CharacterDefinition,
  Actor,
  ItemDefinition,
  DialogueTree,
  DialogueNode,
  DialogueChoice,
  ScriptCommand,
  QueuedAction,
  CursorType,
  GameState,
  RoomState,
  SaveData,
  GameConfig,
  ParallaxLayer,
} from '@/types/game';
