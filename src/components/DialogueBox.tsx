'use client';

// Enhanced Dialogue box component with full choice UI
// The Marble Swindle - UI Component

import { useState, useEffect, useCallback, useRef } from 'react';
import { addScriptEventListener, signalDialogueDismissed } from '@/engine/ScriptRunner';
import {
  addDialogueEventListener,
  selectChoice,
  advanceDialogue,
  getIsDialogueActive,
  getCurrentDialogueNode,
} from '@/engine/DialogueManager';
import { DialogueChoiceDefinition, DialogueNodeDefinition } from '@/types/dialogue';

interface DialogueBoxProps {
  onChoiceSelect?: (choiceId: string) => void;
  textSpeed?: number; // Characters per second
  portraits?: Map<string, string>; // characterId -> portrait path
}

interface DialogueState {
  type: 'say' | 'narrate' | 'thought' | null;
  character?: string;
  text: string;
  portrait?: string;
  choices?: DialogueChoiceDefinition[];
  isDialogueTree: boolean;
}

export default function DialogueBox({
  onChoiceSelect,
  textSpeed = 35,
  portraits,
}: DialogueBoxProps) {
  const [dialogueState, setDialogueState] = useState<DialogueState>({
    type: null,
    text: '',
    isDialogueTree: false,
  });
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Handle dialogue events from ScriptRunner (say/narrate/thought commands)
  useEffect(() => {
    const unsubscribe = addScriptEventListener((type, data) => {
      if (type === 'say') {
        const { character, text, voiceLine } = data as {
          character: string;
          text: string;
          voiceLine?: string;
        };
        const portrait = portraits?.get(character);
        setDialogueState({
          type: 'say',
          character,
          text,
          portrait,
          isDialogueTree: false,
        });
        startTypewriter(text);
      } else if (type === 'narrate') {
        const { text } = data as { text: string };
        setDialogueState({
          type: 'narrate',
          text,
          isDialogueTree: false,
        });
        startTypewriter(text);
      } else if (type === 'thought') {
        const { text } = data as { text: string };
        setDialogueState({
          type: 'thought',
          text,
          isDialogueTree: false,
        });
        startTypewriter(text);
      }
    });

    return unsubscribe;
  }, [portraits, textSpeed]);

  // Handle dialogue events from DialogueManager (dialogue trees)
  useEffect(() => {
    const unsubscribe = addDialogueEventListener((type, data) => {
      switch (type) {
        case 'nodeEnter':
          const node = data.node as DialogueNodeDefinition;
          const nodeType = node.displayType || (node.speaker ? 'say' : 'narrate');
          const portrait = node.portrait || (node.speaker ? portraits?.get(node.speaker) : undefined);
          
          setDialogueState({
            type: nodeType as 'say' | 'narrate' | 'thought',
            character: node.speaker,
            text: node.text,
            portrait,
            choices: undefined, // Clear until choicesReady
            isDialogueTree: true,
          });
          startTypewriter(node.text);
          break;

        case 'choicesReady':
          const choices = data.choices as DialogueChoiceDefinition[];
          setDialogueState((prev) => ({
            ...prev,
            choices,
          }));
          break;

        case 'dialogueEnd':
          setDialogueState({
            type: null,
            text: '',
            isDialogueTree: false,
          });
          setDisplayedText('');
          break;
      }
    });

    return unsubscribe;
  }, [portraits, textSpeed]);

  const startTypewriter = useCallback((text: string) => {
    // Clear any existing typewriter
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }

    setDisplayedText('');
    setIsTyping(true);

    let index = 0;
    typewriterRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }
    }, 1000 / textSpeed);
  }, [textSpeed]);

  const skipTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    setDisplayedText(dialogueState.text);
    setIsTyping(false);
  }, [dialogueState.text]);

  const handleClick = useCallback(() => {
    if (isTyping) {
      // Skip to end of text
      skipTypewriter();
    } else if (dialogueState.type && !dialogueState.choices) {
      // No choices - dismiss dialogue
      if (dialogueState.isDialogueTree) {
        // Advance to next node in dialogue tree
        advanceDialogue();
      } else {
        // Simple script dialogue - dismiss and signal
        setDialogueState({ type: null, text: '', isDialogueTree: false });
        signalDialogueDismissed();
      }
    }
  }, [isTyping, dialogueState, skipTypewriter]);

  const handleChoiceClick = useCallback((choiceId: string) => {
    if (dialogueState.isDialogueTree) {
      selectChoice(choiceId);
    }
    onChoiceSelect?.(choiceId);
  }, [dialogueState.isDialogueTree, onChoiceSelect]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogueState.type) {
        if (e.key === ' ' || e.key === 'Enter') {
          if (!dialogueState.choices || dialogueState.choices.length === 0) {
            e.preventDefault();
            handleClick();
          }
        }
        // Number keys for choices
        if (dialogueState.choices && dialogueState.choices.length > 0 && !isTyping) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= dialogueState.choices.length) {
            handleChoiceClick(dialogueState.choices[num - 1].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClick, handleChoiceClick, dialogueState, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  if (!dialogueState.type) {
    return null;
  }

  const hasChoices = dialogueState.choices && dialogueState.choices.length > 0;

  return (
    <div
      className="dialogue-box fixed inset-0 flex items-end justify-center pb-24 pointer-events-none z-50"
      onClick={handleClick}
    >
      <div
        className={`
          pointer-events-auto max-w-3xl w-full mx-4
          ${dialogueState.type === 'thought' ? 'text-amber-200 italic' : 'text-white'}
        `}
      >
        {/* Main dialogue panel */}
        <div
          className={`
            relative p-6 rounded-lg shadow-2xl border-2
            ${dialogueState.type === 'thought'
              ? 'bg-slate-800/95 border-slate-600'
              : dialogueState.type === 'narrate'
                ? 'bg-slate-900/95 border-slate-500'
                : 'bg-amber-900/95 border-amber-600'
            }
          `}
        >
          {/* Character name */}
          {dialogueState.type === 'say' && dialogueState.character && (
            <div className="absolute -top-3 left-4 px-3 py-1 bg-amber-700 rounded-md border border-amber-500 text-amber-200 text-sm font-bold uppercase tracking-wide shadow-lg">
              {dialogueState.character}
            </div>
          )}

          {/* Portrait */}
          {dialogueState.portrait && (
            <div className="absolute -left-24 -bottom-2 w-28 h-36">
              <img
                src={dialogueState.portrait}
                alt={dialogueState.character || 'Speaker'}
                className="w-full h-full object-contain pixelated drop-shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Dialogue text */}
          <div
            className={`
              text-lg leading-relaxed min-h-[3rem]
              ${dialogueState.portrait ? 'ml-8' : ''}
              ${dialogueState.type === 'thought' ? 'text-slate-300' : ''}
            `}
          >
            {displayedText}
            {isTyping && (
              <span className="inline-block w-2 h-5 bg-current ml-1 animate-pulse" />
            )}
          </div>

          {/* Click to continue indicator */}
          {!isTyping && !hasChoices && (
            <div className="absolute bottom-2 right-4 text-amber-400/60 text-sm animate-pulse flex items-center gap-2">
              <span>Click or press Space</span>
              <span className="text-lg">▶</span>
            </div>
          )}
        </div>

        {/* Dialogue choices */}
        {hasChoices && !isTyping && (
          <div className="mt-3 space-y-2">
            {dialogueState.choices!.map((choice, index) => (
              <button
                key={choice.id}
                className={`
                  w-full p-3 text-left rounded-lg transition-all duration-150
                  flex items-start gap-3
                  ${hoveredChoice === choice.id
                    ? 'bg-amber-700/90 border-amber-400 text-amber-100 scale-[1.02]'
                    : 'bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700/90 hover:border-amber-500'
                  }
                  border-2
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoiceClick(choice.id);
                }}
                onMouseEnter={() => setHoveredChoice(choice.id)}
                onMouseLeave={() => setHoveredChoice(null)}
              >
                <span className="text-amber-500 font-mono text-sm w-5 flex-shrink-0">
                  {index + 1}.
                </span>
                <span className={hoveredChoice === choice.id ? 'text-amber-200' : ''}>
                  {choice.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Keyboard hints for choices */}
        {hasChoices && !isTyping && (
          <div className="mt-2 text-center text-slate-500 text-sm">
            Press 1-{dialogueState.choices!.length} to select
          </div>
        )}
      </div>
    </div>
  );
}
