// Script command execution engine
// The Marble Swindle - Engine Module

import {
  ScriptCommand,
  Point,
} from '@/types/game';
import {
  addItem,
  removeItem,
  setFlag,
  incrementFlag,
  setCurrentRoom,
  setHotspotEnabled,
  adjustReputation,
  markPuzzleSolved,
  evaluateCondition,
  getGameState,
} from './GameState';

// Event emitter for UI interactions
type ScriptEventType = 
  | 'say'
  | 'narrate'
  | 'thought'
  | 'dialogue'
  | 'itemAdded'
  | 'itemRemoved'
  | 'roomChange'
  | 'fadeOut'
  | 'fadeIn'
  | 'walk'
  | 'animate'
  | 'sound'
  | 'music'
  | 'puzzleSolved';

type ScriptEventListener = (type: ScriptEventType, data: unknown) => void;
const eventListeners: ScriptEventListener[] = [];

export function addScriptEventListener(listener: ScriptEventListener): () => void {
  eventListeners.push(listener);
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

function emit(type: ScriptEventType, data: unknown): void {
  for (const listener of eventListeners) {
    listener(type, data);
  }
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Execute a single command
async function executeCommand(command: ScriptCommand): Promise<void> {
  switch (command.type) {
    case 'say':
      emit('say', {
        character: command.character,
        text: command.text,
        voiceLine: command.voiceLine,
      });
      // Wait for dialogue to be dismissed (UI will signal completion)
      await waitForDialogueDismiss();
      break;

    case 'narrate':
      emit('narrate', { text: command.text });
      await waitForDialogueDismiss();
      break;

    case 'thought':
      emit('thought', { text: command.text });
      await waitForDialogueDismiss();
      break;

    case 'setFlag':
      setFlag(command.flag, command.value);
      break;

    case 'incFlag':
      incrementFlag(command.flag, command.amount);
      break;

    case 'giveItem':
      addItem(command.itemId);
      emit('itemAdded', { itemId: command.itemId });
      await sleep(500); // Brief pause to show item acquisition
      break;

    case 'takeItem':
      removeItem(command.itemId);
      emit('itemRemoved', { itemId: command.itemId });
      break;

    case 'enableHotspot':
      const state = getGameState();
      setHotspotEnabled(state.currentRoom, command.hotspotId, command.enabled);
      break;

    case 'teleport':
      emit('walk', {
        characterId: command.characterId,
        position: command.position,
        instant: true,
      });
      break;

    case 'goToRoom':
      emit('fadeOut', { duration: 500 });
      await sleep(500);
      setCurrentRoom(command.roomId);
      emit('roomChange', {
        roomId: command.roomId,
        position: command.position,
      });
      emit('fadeIn', { duration: 500 });
      await sleep(500);
      break;

    case 'playSound':
      emit('sound', { sound: command.sound });
      break;

    case 'playMusic':
      emit('music', {
        music: command.music,
        fade: command.fade,
        action: 'play',
      });
      break;

    case 'stopMusic':
      emit('music', {
        fade: command.fade,
        action: 'stop',
      });
      break;

    case 'wait':
      await sleep(command.seconds * 1000);
      break;

    case 'animate':
      emit('animate', {
        characterId: command.characterId,
        animation: command.animation,
      });
      break;

    case 'walk':
      emit('walk', {
        characterId: command.characterId,
        position: command.position,
        instant: false,
      });
      await waitForWalkComplete(command.characterId);
      break;

    case 'face':
      emit('animate', {
        characterId: command.characterId,
        facing: command.direction,
      });
      break;

    case 'startDialogue':
      emit('dialogue', {
        characterId: command.characterId,
        nodeId: command.nodeId,
      });
      await waitForDialogueComplete();
      break;

    case 'if':
      if (evaluateCondition(command.condition)) {
        await runScript(command.then);
      } else if (command.else) {
        await runScript(command.else);
      }
      break;

    case 'fadeOut':
      emit('fadeOut', { duration: command.duration || 500 });
      await sleep(command.duration || 500);
      break;

    case 'fadeIn':
      emit('fadeIn', { duration: command.duration || 500 });
      await sleep(command.duration || 500);
      break;

    case 'cutscene':
      // Cutscenes are handled by a separate system
      emit('narrate', { text: `[Cutscene: ${command.id}]` });
      break;

    case 'reputation':
      adjustReputation(command.amount);
      if (command.amount > 0) {
        emit('sound', { sound: 'sfx_reputation_up' });
      } else if (command.amount < 0) {
        emit('sound', { sound: 'sfx_reputation_down' });
      }
      break;

    case 'puzzleSolved':
      markPuzzleSolved(command.puzzleId);
      emit('puzzleSolved', { puzzleId: command.puzzleId });
      emit('sound', { sound: 'sting_puzzle_solved' });
      await sleep(1000);
      break;

    default:
      console.warn('Unknown script command:', command);
  }
}

// Run a full script
export async function runScript(commands: ScriptCommand[]): Promise<void> {
  for (const command of commands) {
    await executeCommand(command);
  }
}

// ============================================
// SYNCHRONIZATION HELPERS
// ============================================

// These will be resolved by UI components
let dialogueDismissResolve: (() => void) | null = null;
let dialogueCompleteResolve: (() => void) | null = null;
const walkCompleteResolvers: Map<string, () => void> = new Map();

function waitForDialogueDismiss(): Promise<void> {
  return new Promise((resolve) => {
    dialogueDismissResolve = resolve;
  });
}

function waitForDialogueComplete(): Promise<void> {
  return new Promise((resolve) => {
    dialogueCompleteResolve = resolve;
  });
}

function waitForWalkComplete(characterId: string): Promise<void> {
  return new Promise((resolve) => {
    walkCompleteResolvers.set(characterId, resolve);
  });
}

// Called by UI when dialogue is dismissed
export function signalDialogueDismissed(): void {
  if (dialogueDismissResolve) {
    const resolve = dialogueDismissResolve;
    dialogueDismissResolve = null;
    resolve();
  }
}

// Called by UI when dialogue tree completes
export function signalDialogueComplete(): void {
  if (dialogueCompleteResolve) {
    const resolve = dialogueCompleteResolve;
    dialogueCompleteResolve = null;
    resolve();
  }
}

// Called by game scene when character finishes walking
export function signalWalkComplete(characterId: string): void {
  const resolve = walkCompleteResolvers.get(characterId);
  if (resolve) {
    walkCompleteResolvers.delete(characterId);
    resolve();
  }
}

// ============================================
// SCRIPT CONTEXT
// ============================================

// Check if currently running a script (for blocking input)
let isRunningScript = false;

export function getIsRunningScript(): boolean {
  return isRunningScript;
}

export async function runScriptWithContext(
  commands: ScriptCommand[]
): Promise<void> {
  isRunningScript = true;
  try {
    await runScript(commands);
  } finally {
    isRunningScript = false;
  }
}
