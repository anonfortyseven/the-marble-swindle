// Core game type definitions for The Marble Swindle

// ============================================
// GEOMETRY TYPES
// ============================================

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  points: Point[];
}

// ============================================
// ROOM/SCENE TYPES
// ============================================

export interface RoomExit {
  id: string;
  targetRoom: string;
  targetPosition?: Point;
  polygon: Polygon;
  cursor?: CursorType;
  condition?: string; // Flag expression like "hasKey && !doorLocked"
}

export interface Hotspot {
  id: string;
  name: string;
  polygon: Polygon;
  interactionPoint: Point; // Where player walks to before interacting
  cursor: CursorType;
  lookScript?: ScriptCommand[];
  useScript?: ScriptCommand[];
  talkScript?: ScriptCommand[];
  useWithItem?: { [itemId: string]: ScriptCommand[] };
  enabled?: boolean;
  condition?: string;
}

export interface RoomCharacter {
  id: string;
  characterId: string;
  position: Point;
  facing: 'left' | 'right';
  condition?: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  background: string;
  music?: string;
  ambience?: string;
  walkableArea: Polygon;
  exits: RoomExit[];
  hotspots: Hotspot[];
  characters: RoomCharacter[];
  onEnter?: ScriptCommand[];
  onExit?: ScriptCommand[];
  parallaxLayers?: ParallaxLayer[];
}

export interface ParallaxLayer {
  image: string;
  depth: number;
  scrollFactor: number;
}

// ============================================
// CHARACTER TYPES
// ============================================

export interface CharacterDefinition {
  id: string;
  name: string;
  spriteSheet: string;
  frameWidth: number;
  frameHeight: number;
  animations: {
    idle: { frames: number[]; frameRate: number };
    walk: { frames: number[]; frameRate: number };
    talk: { frames: number[]; frameRate: number };
    gesture?: { frames: number[]; frameRate: number };
  };
  dialoguePortrait?: string;
  walkSpeed: number;
  interactionRadius: number;
}

export interface Actor {
  id: string;
  characterId: string;
  position: Point;
  facing: 'left' | 'right';
  currentAnimation: string;
  isWalking: boolean;
  path: Point[];
  actionQueue: QueuedAction[];
}

// ============================================
// INVENTORY TYPES
// ============================================

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  examineText: string;
  canCombineWith?: string[]; // IDs of items this can combine with
  combineResult?: { [itemId: string]: string }; // What combining produces
  combineScript?: { [itemId: string]: ScriptCommand[] };
}

// ============================================
// DIALOGUE TYPES
// ============================================

export interface DialogueChoice {
  id: string;
  text: string;
  targetNode: string;
  condition?: string;
  onSelect?: ScriptCommand[];
  once?: boolean; // Hide after selection
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  voiceLine?: string;
  portrait?: string;
  choices?: DialogueChoice[];
  next?: string; // Auto-advance to this node
  onEnter?: ScriptCommand[];
  onExit?: ScriptCommand[];
  endConversation?: boolean;
}

export interface DialogueTree {
  id: string;
  characterId: string;
  startNode: string;
  nodes: { [nodeId: string]: DialogueNode };
}

// ============================================
// SCRIPT COMMAND TYPES
// ============================================

export type ScriptCommand =
  | { type: 'say'; character: string; text: string; voiceLine?: string }
  | { type: 'narrate'; text: string }
  | { type: 'thought'; text: string }
  | { type: 'setFlag'; flag: string; value: boolean | number | string }
  | { type: 'incFlag'; flag: string; amount: number }
  | { type: 'giveItem'; itemId: string }
  | { type: 'takeItem'; itemId: string }
  | { type: 'enableHotspot'; hotspotId: string; enabled: boolean }
  | { type: 'teleport'; characterId: string; position: Point }
  | { type: 'goToRoom'; roomId: string; position?: Point }
  | { type: 'playSound'; sound: string }
  | { type: 'playMusic'; music: string; fade?: number }
  | { type: 'stopMusic'; fade?: number }
  | { type: 'wait'; seconds: number }
  | { type: 'animate'; characterId: string; animation: string }
  | { type: 'walk'; characterId: string; position: Point }
  | { type: 'face'; characterId: string; direction: 'left' | 'right' }
  | { type: 'startDialogue'; characterId: string; nodeId?: string }
  | { type: 'if'; condition: string; then: ScriptCommand[]; else?: ScriptCommand[] }
  | { type: 'fadeOut'; duration?: number }
  | { type: 'fadeIn'; duration?: number }
  | { type: 'cutscene'; id: string }
  | { type: 'reputation'; amount: number }
  | { type: 'puzzleSolved'; puzzleId: string };

// ============================================
// ACTION QUEUE TYPES
// ============================================

export interface QueuedAction {
  type: 'walk' | 'interact' | 'use' | 'talk' | 'look' | 'useItem';
  target?: Point;
  hotspotId?: string;
  characterId?: string;
  itemId?: string;
  onComplete?: () => void;
}

// ============================================
// CURSOR TYPES
// ============================================

export type CursorType = 'default' | 'walk' | 'look' | 'use' | 'talk' | 'exit' | 'pickup' | 'item';

// ============================================
// GAME STATE
// ============================================

export interface GameState {
  currentRoom: string;
  playerPosition: Point;
  playerFacing: 'left' | 'right';
  inventory: string[];
  flags: { [key: string]: boolean | number | string };
  visitedRooms: string[];
  solvedPuzzles: string[];
  reputation: number;
  dialogueHistory: string[]; // Nodes that have been visited
  selectedChoices: string[]; // Choices that have been made
  roomStates: { [roomId: string]: RoomState };
}

export interface RoomState {
  disabledHotspots: string[];
  removedCharacters: string[];
  customFlags: { [key: string]: boolean | number | string };
}

// ============================================
// SAVE DATA
// ============================================

export interface SaveData {
  version: string;
  timestamp: number;
  slotName: string;
  gameState: GameState;
  screenshot?: string; // Base64 thumbnail
}

// ============================================
// ENGINE CONFIG
// ============================================

export interface GameConfig {
  gameWidth: number;
  gameHeight: number;
  pixelScale: number;
  walkSpeed: number;
  dialogueSpeed: number; // Characters per second
  enableVoice: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  gameWidth: 960,
  gameHeight: 600,
  pixelScale: 3,
  walkSpeed: 150,
  dialogueSpeed: 30,
  enableVoice: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  voiceVolume: 1.0,
};
