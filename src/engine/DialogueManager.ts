// Dialogue tree management system
// The Marble Swindle - Engine Module

import {
  DialogueTree,
  DialogueNode,
  DialogueChoice,
  ScriptCommand,
} from '@/types/game';
import {
  evaluateCondition,
  hasSelectedChoice,
  recordDialogueVisit,
  recordChoiceSelection,
} from './GameState';
import { runScriptWithContext } from './ScriptRunner';

// Dialogue tree storage
const dialogueTrees: Map<string, DialogueTree> = new Map();

// Current dialogue state
let currentTree: DialogueTree | null = null;
let currentNode: DialogueNode | null = null;
let isDialogueActive = false;

// Event callbacks
type DialogueEventType = 'nodeEnter' | 'nodeExit' | 'choicesReady' | 'dialogueEnd';
type DialogueEventListener = (
  type: DialogueEventType,
  data: {
    node?: DialogueNode;
    choices?: DialogueChoice[];
    tree?: DialogueTree;
  }
) => void;

const eventListeners: DialogueEventListener[] = [];

export function addDialogueEventListener(listener: DialogueEventListener): () => void {
  eventListeners.push(listener);
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

function emit(type: DialogueEventType, data: Parameters<DialogueEventListener>[1]): void {
  for (const listener of eventListeners) {
    listener(type, data);
  }
}

// ============================================
// REGISTRATION
// ============================================

export function registerDialogueTree(tree: DialogueTree): void {
  dialogueTrees.set(tree.id, tree);
}

export function getDialogueTree(id: string): DialogueTree | undefined {
  return dialogueTrees.get(id);
}

// ============================================
// DIALOGUE FLOW
// ============================================

export async function startDialogue(
  characterId: string,
  startNodeId?: string
): Promise<void> {
  // Find dialogue tree for this character
  const tree = Array.from(dialogueTrees.values()).find(
    (t) => t.characterId === characterId
  );

  if (!tree) {
    console.warn(`No dialogue tree found for character: ${characterId}`);
    return;
  }

  currentTree = tree;
  isDialogueActive = true;

  // Enter the starting node
  const nodeId = startNodeId || tree.startNode;
  await enterNode(nodeId);
}

async function enterNode(nodeId: string): Promise<void> {
  if (!currentTree) return;

  const node = currentTree.nodes[nodeId];
  if (!node) {
    console.error(`Dialogue node not found: ${nodeId}`);
    endDialogue();
    return;
  }

  currentNode = node;
  recordDialogueVisit(`${currentTree.id}:${nodeId}`);

  // Run onEnter script
  if (node.onEnter) {
    await runScriptWithContext(node.onEnter);
  }

  // Emit node enter event (UI will display text)
  emit('nodeEnter', { node, tree: currentTree });

  // If there are choices, filter and emit them
  if (node.choices && node.choices.length > 0) {
    const availableChoices = filterChoices(node.choices);
    if (availableChoices.length > 0) {
      emit('choicesReady', { choices: availableChoices, node });
    } else {
      // No available choices, treat as end
      await handleAutoAdvance(node);
    }
  } else if (node.next) {
    // Auto-advance after text is dismissed
    // The UI will call advanceDialogue() when ready
  } else if (node.endConversation) {
    // End after text is dismissed
  }
}

function filterChoices(choices: DialogueChoice[]): DialogueChoice[] {
  return choices.filter((choice) => {
    // Check condition
    if (choice.condition && !evaluateCondition(choice.condition)) {
      return false;
    }

    // Check if "once" choice was already selected
    if (choice.once && hasSelectedChoice(`${currentTree?.id}:${choice.id}`)) {
      return false;
    }

    return true;
  });
}

export async function selectChoice(choiceId: string): Promise<void> {
  if (!currentTree || !currentNode || !currentNode.choices) return;

  const choice = currentNode.choices.find((c) => c.id === choiceId);
  if (!choice) {
    console.error(`Choice not found: ${choiceId}`);
    return;
  }

  // Record choice selection
  recordChoiceSelection(`${currentTree.id}:${choice.id}`);

  // Run onExit for current node
  if (currentNode.onExit) {
    await runScriptWithContext(currentNode.onExit);
  }

  emit('nodeExit', { node: currentNode });

  // Run choice's onSelect script
  if (choice.onSelect) {
    await runScriptWithContext(choice.onSelect);
  }

  // Go to target node
  if (choice.targetNode === 'end') {
    endDialogue();
  } else {
    await enterNode(choice.targetNode);
  }
}

export async function advanceDialogue(): Promise<void> {
  if (!currentTree || !currentNode) return;

  // Run onExit for current node
  if (currentNode.onExit) {
    await runScriptWithContext(currentNode.onExit);
  }

  emit('nodeExit', { node: currentNode });

  await handleAutoAdvance(currentNode);
}

async function handleAutoAdvance(node: DialogueNode): Promise<void> {
  if (node.next) {
    if (node.next === 'end') {
      endDialogue();
    } else {
      await enterNode(node.next);
    }
  } else if (node.endConversation) {
    endDialogue();
  } else if (!node.choices || node.choices.length === 0) {
    // No next, no choices = end
    endDialogue();
  }
}

function endDialogue(): void {
  const tree = currentTree;
  currentTree = null;
  currentNode = null;
  isDialogueActive = false;

  emit('dialogueEnd', { tree });
}

// ============================================
// GETTERS
// ============================================

export function getIsDialogueActive(): boolean {
  return isDialogueActive;
}

export function getCurrentDialogueNode(): DialogueNode | null {
  return currentNode;
}

export function getCurrentDialogueTree(): DialogueTree | null {
  return currentTree;
}

// ============================================
// UTILITY: Create dialogue trees programmatically
// ============================================

export interface DialogueBuilder {
  id: string;
  characterId: string;
  nodes: Map<string, DialogueNode>;
  addNode(id: string, node: Omit<DialogueNode, 'id'>): DialogueBuilder;
  build(): DialogueTree;
}

export function createDialogueBuilder(
  id: string,
  characterId: string
): DialogueBuilder {
  const nodes = new Map<string, DialogueNode>();

  return {
    id,
    characterId,
    nodes,
    addNode(nodeId: string, node: Omit<DialogueNode, 'id'>) {
      nodes.set(nodeId, { ...node, id: nodeId });
      return this;
    },
    build(): DialogueTree {
      const tree: DialogueTree = {
        id,
        characterId,
        startNode: 'start',
        nodes: Object.fromEntries(nodes),
      };
      registerDialogueTree(tree);
      return tree;
    },
  };
}

// ============================================
// SAMPLE DIALOGUE TREE
// ============================================

// Create a sample dialogue tree for testing
export function createSampleDialogueTrees(): void {
  // Maybelle Sutter - General Store Owner
  createDialogueBuilder('maybelle_intro', 'maybelle')
    .addNode('start', {
      speaker: 'Maybelle',
      text: "Well now, you're a new face. Don't get many travelers since the mine closed.",
      next: 'greeting_response',
    })
    .addNode('greeting_response', {
      speaker: 'Clem',
      text: "Name's Clem Buckley. I'm looking for information about my uncle.",
      choices: [
        {
          id: 'ask_uncle',
          text: 'Have you seen a man named Cornelius Buckley?',
          targetNode: 'about_cornelius',
        },
        {
          id: 'ask_cave',
          text: 'Tell me about the cave.',
          targetNode: 'about_cave',
        },
        {
          id: 'ask_town',
          text: 'What happened to this town?',
          targetNode: 'about_town',
        },
        {
          id: 'end_convo',
          text: "I'll look around first.",
          targetNode: 'end',
        },
      ],
    })
    .addNode('about_cornelius', {
      speaker: 'Maybelle',
      text: "Cornelius? Oh, the theatrical fellow with all the questions about Spanish treasure. He was here about a month ago. Asked a lot of questions, then headed to the cave.",
      onEnter: [{ type: 'setFlag', flag: 'learned_about_cornelius', value: true }],
      choices: [
        {
          id: 'cornelius_more',
          text: "What kind of questions did he ask?",
          targetNode: 'cornelius_questions',
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'greeting_response',
        },
      ],
    })
    .addNode('cornelius_questions', {
      speaker: 'Maybelle',
      text: "He wanted to know about the Spanish exploration. About what the mining company found. And he was very interested in William Lynch — the man who just bought the cave.",
      next: 'cornelius_warning',
    })
    .addNode('cornelius_warning', {
      speaker: 'Maybelle',
      text: "Listen, I don't know what your uncle was after, but folks around here don't take kindly to treasure hunters. Especially after what the Bald Knobbers did.",
      onEnter: [
        { type: 'setFlag', flag: 'warned_about_bald_knobbers', value: true },
      ],
      choices: [
        {
          id: 'ask_bald_knobbers',
          text: "Who are the Bald Knobbers?",
          targetNode: 'about_bald_knobbers',
          once: true,
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'greeting_response',
        },
      ],
    })
    .addNode('about_bald_knobbers', {
      speaker: 'Maybelle',
      text: "Vigilantes. Started out keeping order after the war, but they turned mean. Wore masks made from flour sacks with horns. They're the ones who burned Marmaros to the ground.",
      onEnter: [
        { type: 'setFlag', flag: 'learned_about_bald_knobbers', value: true },
      ],
      next: 'greeting_response',
    })
    .addNode('about_cave', {
      speaker: 'Maybelle',
      text: "They call it Marvel Cave now. Used to be Marble Cave, but there ain't no marble. Just bat droppings and limestone. The mining company went bust trying to dig the stuff out.",
      choices: [
        {
          id: 'ask_mining',
          text: "Tell me about the mining company.",
          targetNode: 'about_mining',
        },
        {
          id: 'ask_lynch',
          text: "Who owns the cave now?",
          targetNode: 'about_lynch',
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'greeting_response',
        },
      ],
    })
    .addNode('about_mining', {
      speaker: 'Maybelle',
      text: "The Marble Cave Mining Company. Showed up in '84, dug out all the bat guano they could find, then left when the money ran out. That's when the Bald Knobbers came.",
      next: 'greeting_response',
    })
    .addNode('about_lynch', {
      speaker: 'Maybelle',
      text: "William Lynch. A Canadian, if you can believe it. Bought the whole property just yesterday. Seems to think he can turn the cave into some kind of tourist attraction.",
      onEnter: [{ type: 'setFlag', flag: 'learned_about_lynch', value: true }],
      choices: [
        {
          id: 'meet_lynch',
          text: "Where can I find Mr. Lynch?",
          targetNode: 'lynch_location',
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'greeting_response',
        },
      ],
    })
    .addNode('lynch_location', {
      speaker: 'Maybelle',
      text: "He's set up camp at the old Lynch homestead, just past the sinkhole. Can't miss it — only building that didn't get burned.",
      onEnter: [{ type: 'setFlag', flag: 'know_lynch_location', value: true }],
      next: 'greeting_response',
    })
    .addNode('about_town', {
      speaker: 'Maybelle',
      text: "Marmaros. Used to have near thirty souls living here. Now it's just me, old Ezra at the carpentry, and a few others who were too stubborn to leave.",
      next: 'town_burned',
    })
    .addNode('town_burned', {
      speaker: 'Maybelle',
      text: "The Bald Knobbers burned most of it when the mine closed. Said we were harboring criminals. Really they just wanted to run us out.",
      next: 'greeting_response',
    })
    .build();

  // William Lynch - Cave Owner
  createDialogueBuilder('lynch_intro', 'lynch')
    .addNode('start', {
      speaker: 'Lynch',
      text: "Welcome, welcome! You must be here about the cave! I'm William Lynch, the new proprietor of Marvel Cave — soon to be the greatest natural wonder attraction in all of Missouri!",
      next: 'intro_response',
    })
    .addNode('intro_response', {
      speaker: 'Clem',
      text: "Actually, I'm looking for my uncle. Cornelius Buckley.",
      next: 'lynch_knows_cornelius',
    })
    .addNode('lynch_knows_cornelius', {
      speaker: 'Lynch',
      text: "Cornelius! A fascinating fellow. Helped me survey the cave before I bought it. Said he was researching for a book about Ozark history.",
      onEnter: [
        { type: 'setFlag', flag: 'lynch_mentioned_cornelius', value: true },
      ],
      choices: [
        {
          id: 'cornelius_whereabouts',
          text: "When did you last see him?",
          targetNode: 'last_saw_cornelius',
        },
        {
          id: 'cornelius_research',
          text: "What kind of research?",
          targetNode: 'cornelius_research',
        },
        {
          id: 'cave_tour',
          text: "Can I see the cave?",
          targetNode: 'cave_access',
        },
      ],
    })
    .addNode('last_saw_cornelius', {
      speaker: 'Lynch',
      text: "Let me think... about two weeks ago? He went down into the cave for one of his surveys and I haven't seen him since. Assumed he'd moved on to his next research site.",
      onEnter: [
        { type: 'setFlag', flag: 'cornelius_last_seen_two_weeks', value: true },
      ],
      choices: [
        {
          id: 'concerned',
          text: "I'm worried something happened to him.",
          targetNode: 'lynch_reassures',
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'lynch_knows_cornelius',
        },
      ],
    })
    .addNode('lynch_reassures', {
      speaker: 'Lynch',
      text: "The cave can be dangerous if you don't know what you're doing, but your uncle seemed experienced. I'm sure he's fine. Though... there are some passages I haven't explored yet.",
      next: 'lynch_knows_cornelius',
    })
    .addNode('cornelius_research', {
      speaker: 'Lynch',
      text: "Spanish exploration, mostly. The story goes that conquistadors came through here in 1541. Left a ladder in the cave that's still there! Your uncle was particularly interested in something called the 'Spring Room.'",
      onEnter: [
        { type: 'setFlag', flag: 'learned_about_spring_room', value: true },
      ],
      next: 'lynch_knows_cornelius',
    })
    .addNode('cave_access', {
      speaker: 'Lynch',
      text: "The cave? Of course! Though I should warn you — the descent is treacherous. The pulley system the miners left behind needs repairs before I can let anyone down there safely.",
      choices: [
        {
          id: 'offer_help',
          text: "I could help repair it.",
          targetNode: 'repair_quest',
          condition: "!getFlag('pulley_fixed')",
        },
        {
          id: 'explore_anyway',
          text: "I'll find another way down.",
          targetNode: 'lynch_warns',
        },
        {
          id: 'back_to_topics',
          text: "I have other questions.",
          targetNode: 'lynch_knows_cornelius',
        },
      ],
    })
    .addNode('repair_quest', {
      speaker: 'Lynch',
      text: "Would you? I'd be much obliged! The old rope is frayed beyond use. If you can find some new rope — good strong hemp, not that cheap stuff — I'll show you the cave myself.",
      onEnter: [
        { type: 'setFlag', flag: 'need_rope_for_pulley', value: true },
      ],
      next: 'lynch_knows_cornelius',
    })
    .addNode('lynch_warns', {
      speaker: 'Lynch',
      text: "I'd advise against that. The sinkhole is over two hundred feet deep. Without the pulley system, you'd need to climb down that old frayed rope. One slip and you'd never be found.",
      next: 'lynch_knows_cornelius',
    })
    .build();
}
