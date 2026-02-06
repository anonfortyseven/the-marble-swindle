// Dialogue system type definitions for The Marble Swindle
// JSON-based dialogue tree format

import { ScriptCommand } from './game';

// ============================================
// DIALOGUE NODE TYPES
// ============================================

/**
 * Represents a single choice option in a dialogue node
 */
export interface DialogueChoiceDefinition {
  /** Unique identifier for this choice */
  id: string;
  /** Text displayed to the player */
  text: string;
  /** Node to jump to when selected */
  targetNode: string;
  /** Condition that must be true for this choice to appear */
  condition?: string;
  /** Script commands to run when this choice is selected */
  onSelect?: ScriptCommand[];
  /** If true, this choice disappears after being selected once */
  once?: boolean;
  /** Optional reputation/flag requirement to display */
  requires?: DialogueRequirement;
}

/**
 * Requirement for displaying a dialogue choice or node
 */
export interface DialogueRequirement {
  /** Minimum reputation required */
  minReputation?: number;
  /** Maximum reputation allowed */
  maxReputation?: number;
  /** Items that must be in inventory */
  hasItems?: string[];
  /** Flags that must be set */
  flags?: { [flagName: string]: boolean | number | string };
  /** Puzzles that must be solved */
  solvedPuzzles?: string[];
}

/**
 * A single node in a dialogue tree
 */
export interface DialogueNodeDefinition {
  /** Unique identifier within the tree */
  id: string;
  /** Character who speaks this line (if any) */
  speaker?: string;
  /** The dialogue text to display */
  text: string;
  /** Path to voice line audio file */
  voiceLine?: string;
  /** Path to portrait image to show */
  portrait?: string;
  /** Choices available to the player */
  choices?: DialogueChoiceDefinition[];
  /** Next node to auto-advance to (if no choices) */
  next?: string;
  /** Script commands to run when entering this node */
  onEnter?: ScriptCommand[];
  /** Script commands to run when exiting this node */
  onExit?: ScriptCommand[];
  /** If true, ends the conversation after this node */
  endConversation?: boolean;
  /** Emotion/mood for the speaker (affects portrait) */
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thoughtful';
  /** Display type for this node */
  displayType?: 'say' | 'thought' | 'narrate';
}

/**
 * A complete dialogue tree for a character or interaction
 */
export interface DialogueTreeDefinition {
  /** Unique identifier for this dialogue tree */
  id: string;
  /** Character this dialogue belongs to */
  characterId: string;
  /** The starting node ID */
  startNode: string;
  /** All nodes in this dialogue tree */
  nodes: { [nodeId: string]: DialogueNodeDefinition };
  /** Metadata about this dialogue */
  metadata?: DialogueMetadata;
}

/**
 * Metadata for a dialogue tree
 */
export interface DialogueMetadata {
  /** Human-readable title */
  title?: string;
  /** Description of when this dialogue occurs */
  description?: string;
  /** Priority for selecting between multiple valid dialogues */
  priority?: number;
  /** Condition that must be true for this dialogue to be available */
  condition?: string;
  /** If true, this dialogue can only be triggered once */
  oneTime?: boolean;
}

// ============================================
// DIALOGUE FILE FORMAT
// ============================================

/**
 * Format of a dialogue JSON file
 * Each file can contain multiple dialogue trees for a character
 */
export interface DialogueFile {
  /** Version for migration purposes */
  version: string;
  /** Character ID this file belongs to */
  characterId: string;
  /** Character's display name */
  characterName: string;
  /** Default portrait path */
  defaultPortrait?: string;
  /** All dialogue trees in this file */
  dialogues: DialogueTreeDefinition[];
}

// ============================================
// RUNTIME DIALOGUE STATE
// ============================================

/**
 * Current state of an active dialogue
 */
export interface DialogueRuntimeState {
  /** Currently active dialogue tree */
  tree: DialogueTreeDefinition | null;
  /** Current node being displayed */
  currentNode: DialogueNodeDefinition | null;
  /** Available choices (filtered by conditions) */
  availableChoices: DialogueChoiceDefinition[];
  /** Is dialogue currently active */
  isActive: boolean;
  /** Is waiting for player input */
  waitingForInput: boolean;
  /** History of nodes visited in current conversation */
  conversationHistory: string[];
}

// ============================================
// DIALOGUE EVENTS
// ============================================

export type DialogueEventType =
  | 'dialogue:start'
  | 'dialogue:nodeEnter'
  | 'dialogue:nodeExit'
  | 'dialogue:choicesReady'
  | 'dialogue:choiceSelected'
  | 'dialogue:end';

export interface DialogueEvent {
  type: DialogueEventType;
  treeId?: string;
  nodeId?: string;
  choiceId?: string;
  node?: DialogueNodeDefinition;
  choices?: DialogueChoiceDefinition[];
}

// ============================================
// DIALOGUE BUILDER HELPERS
// ============================================

/**
 * Fluent builder for creating dialogue nodes
 */
export interface NodeBuilder {
  id: string;
  speaker(name: string): NodeBuilder;
  text(text: string): NodeBuilder;
  portrait(path: string): NodeBuilder;
  emotion(emotion: DialogueNodeDefinition['emotion']): NodeBuilder;
  voiceLine(path: string): NodeBuilder;
  next(nodeId: string): NodeBuilder;
  end(): NodeBuilder;
  onEnter(commands: ScriptCommand[]): NodeBuilder;
  onExit(commands: ScriptCommand[]): NodeBuilder;
  choice(id: string, text: string, targetNode: string, options?: Partial<DialogueChoiceDefinition>): NodeBuilder;
  build(): DialogueNodeDefinition;
}

/**
 * Create a node builder
 */
export function createNodeBuilder(id: string): NodeBuilder {
  const node: DialogueNodeDefinition = { id, text: '' };
  const choices: DialogueChoiceDefinition[] = [];

  const builder: NodeBuilder = {
    id,
    speaker(name) {
      node.speaker = name;
      return builder;
    },
    text(text) {
      node.text = text;
      return builder;
    },
    portrait(path) {
      node.portrait = path;
      return builder;
    },
    emotion(emotion) {
      node.emotion = emotion;
      return builder;
    },
    voiceLine(path) {
      node.voiceLine = path;
      return builder;
    },
    next(nodeId) {
      node.next = nodeId;
      return builder;
    },
    end() {
      node.endConversation = true;
      return builder;
    },
    onEnter(commands) {
      node.onEnter = commands;
      return builder;
    },
    onExit(commands) {
      node.onExit = commands;
      return builder;
    },
    choice(id, text, targetNode, options = {}) {
      choices.push({ id, text, targetNode, ...options });
      return builder;
    },
    build() {
      if (choices.length > 0) {
        node.choices = choices;
      }
      return node;
    },
  };

  return builder;
}

// ============================================
// CONDITION HELPERS
// ============================================

/**
 * Common condition expressions
 */
export const Conditions = {
  hasItem: (itemId: string) => `hasItem("${itemId}")`,
  notHasItem: (itemId: string) => `!hasItem("${itemId}")`,
  flagEquals: (flag: string, value: boolean | number | string) =>
    typeof value === 'string' ? `getFlag("${flag}") === "${value}"` : `getFlag("${flag}") === ${value}`,
  flagGreaterThan: (flag: string, value: number) => `getFlag("${flag}") > ${value}`,
  flagLessThan: (flag: string, value: number) => `getFlag("${flag}") < ${value}`,
  visited: (roomId: string) => `hasVisitedRoom("${roomId}")`,
  solved: (puzzleId: string) => `hasSolvedPuzzle("${puzzleId}")`,
  reputationAbove: (value: number) => `reputation > ${value}`,
  reputationBelow: (value: number) => `reputation < ${value}`,
  and: (...conditions: string[]) => `(${conditions.join(' && ')})`,
  or: (...conditions: string[]) => `(${conditions.join(' || ')})`,
  not: (condition: string) => `!(${condition})`,
};
