// JSON-based dialogue loading system
// The Marble Swindle - Engine Module

import {
  DialogueFile,
  DialogueTreeDefinition,
  DialogueNodeDefinition,
} from '@/types/dialogue';
import {
  DialogueTree,
  DialogueNode,
  DialogueChoice,
} from '@/types/game';
import { registerDialogueTree } from './DialogueManager';
import { evaluateCondition } from './GameState';

// ============================================
// DIALOGUE REGISTRY
// ============================================

// Store all loaded dialogue files
const dialogueFiles: Map<string, DialogueFile> = new Map();
const dialogueTrees: Map<string, DialogueTreeDefinition> = new Map();

// ============================================
// LOADING
// ============================================

/**
 * Load a dialogue file and register its trees
 */
export function loadDialogueFile(file: DialogueFile): void {
  dialogueFiles.set(file.characterId, file);

  for (const dialogue of file.dialogues) {
    dialogueTrees.set(dialogue.id, dialogue);
    
    // Convert to engine format and register
    const engineTree = convertToEngineFormat(dialogue);
    registerDialogueTree(engineTree);
  }

  console.log(
    `Loaded ${file.dialogues.length} dialogue trees for ${file.characterName}`
  );
}

/**
 * Load dialogue from a JSON object (for static imports)
 */
export function loadDialogueFromJSON(json: DialogueFile): void {
  loadDialogueFile(json);
}

/**
 * Load dialogue from a URL
 */
export async function loadDialogueFromURL(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load dialogue: ${response.statusText}`);
    }
    const json = await response.json() as DialogueFile;
    loadDialogueFile(json);
  } catch (error) {
    console.error(`Error loading dialogue from ${url}:`, error);
    throw error;
  }
}

/**
 * Load all dialogue files from a directory (requires file list)
 */
export async function loadAllDialogues(urls: string[]): Promise<void> {
  await Promise.all(urls.map(loadDialogueFromURL));
}

// ============================================
// CONVERSION
// ============================================

/**
 * Convert JSON dialogue definition to engine format
 */
function convertToEngineFormat(def: DialogueTreeDefinition): DialogueTree {
  const nodes: { [nodeId: string]: DialogueNode } = {};

  for (const [nodeId, nodeDef] of Object.entries(def.nodes)) {
    nodes[nodeId] = convertNode(nodeDef);
  }

  return {
    id: def.id,
    characterId: def.characterId,
    startNode: def.startNode,
    nodes,
  };
}

function convertNode(def: DialogueNodeDefinition): DialogueNode {
  const node: DialogueNode = {
    id: def.id,
    text: def.text,
  };

  if (def.speaker) node.speaker = def.speaker;
  if (def.voiceLine) node.voiceLine = def.voiceLine;
  if (def.portrait) node.portrait = def.portrait;
  if (def.next) node.next = def.next;
  if (def.endConversation) node.endConversation = def.endConversation;
  if (def.onEnter) node.onEnter = def.onEnter;
  if (def.onExit) node.onExit = def.onExit;

  if (def.choices && def.choices.length > 0) {
    node.choices = def.choices.map((c) => ({
      id: c.id,
      text: c.text,
      targetNode: c.targetNode,
      condition: c.condition,
      onSelect: c.onSelect,
      once: c.once,
    }));
  }

  return node;
}

// ============================================
// DIALOGUE SELECTION
// ============================================

/**
 * Find the best dialogue tree for a character based on current game state
 */
export function findDialogueForCharacter(characterId: string): DialogueTreeDefinition | null {
  const file = dialogueFiles.get(characterId);
  if (!file) {
    console.warn(`No dialogue file found for character: ${characterId}`);
    return null;
  }

  // Sort by priority (higher first)
  const sortedDialogues = [...file.dialogues].sort(
    (a, b) => (b.metadata?.priority || 0) - (a.metadata?.priority || 0)
  );

  // Find first dialogue whose condition is met
  for (const dialogue of sortedDialogues) {
    const condition = dialogue.metadata?.condition;
    if (!condition || evaluateCondition(condition)) {
      return dialogue;
    }
  }

  // Return first dialogue as fallback
  return sortedDialogues[0] || null;
}

/**
 * Get a specific dialogue tree by ID
 */
export function getDialogueById(id: string): DialogueTreeDefinition | null {
  return dialogueTrees.get(id) || null;
}

/**
 * Get all dialogue trees for a character
 */
export function getDialoguesForCharacter(
  characterId: string
): DialogueTreeDefinition[] {
  const file = dialogueFiles.get(characterId);
  return file ? file.dialogues : [];
}

/**
 * Check if a dialogue has been used (for oneTime dialogues)
 */
export function isDialogueUsed(dialogueId: string): boolean {
  // This would check against game state
  // For now, return false (not implemented)
  return false;
}

// ============================================
// UTILITY
// ============================================

/**
 * Get character info from dialogue file
 */
export function getCharacterInfo(
  characterId: string
): { name: string; portrait?: string } | null {
  const file = dialogueFiles.get(characterId);
  if (!file) return null;

  return {
    name: file.characterName,
    portrait: file.defaultPortrait,
  };
}

/**
 * Get all loaded character IDs
 */
export function getLoadedCharacters(): string[] {
  return Array.from(dialogueFiles.keys());
}

/**
 * Clear all loaded dialogues
 */
export function clearDialogues(): void {
  dialogueFiles.clear();
  dialogueTrees.clear();
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a dialogue file for common errors
 */
export function validateDialogueFile(
  file: DialogueFile
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const dialogue of file.dialogues) {
    // Check start node exists
    if (!dialogue.nodes[dialogue.startNode]) {
      errors.push(
        `Dialogue ${dialogue.id}: Start node '${dialogue.startNode}' not found`
      );
    }

    // Check all node references are valid
    for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
      // Check next reference
      if (node.next && node.next !== 'end' && !dialogue.nodes[node.next]) {
        errors.push(
          `Dialogue ${dialogue.id}, node ${nodeId}: 'next' references non-existent node '${node.next}'`
        );
      }

      // Check choice references
      if (node.choices) {
        for (const choice of node.choices) {
          if (choice.targetNode !== 'end' && !dialogue.nodes[choice.targetNode]) {
            errors.push(
              `Dialogue ${dialogue.id}, node ${nodeId}, choice ${choice.id}: 'targetNode' references non-existent node '${choice.targetNode}'`
            );
          }
        }
      }

      // Check node has either next, choices, or endConversation
      if (!node.next && !node.choices && !node.endConversation) {
        errors.push(
          `Dialogue ${dialogue.id}, node ${nodeId}: Node has no exit (next, choices, or endConversation)`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
