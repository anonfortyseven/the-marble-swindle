'use client';

import { useState, useEffect, useCallback } from 'react';
import { addScriptEventListener, signalDialogueDismissed } from '@/engine/ScriptRunner';

interface DialogueBoxProps {
  onChoiceSelect?: (choiceId: string) => void;
}

interface DialogueState {
  type: 'say' | 'narrate' | 'thought' | null;
  character?: string;
  text: string;
  portrait?: string;
  choices?: Array<{ id: string; text: string }>;
}

export default function DialogueBox({ onChoiceSelect }: DialogueBoxProps) {
  const [dialogueState, setDialogueState] = useState<DialogueState>({
    type: null,
    text: '',
  });
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [textSpeed] = useState(30); // Characters per second

  // Handle dialogue events from script runner
  useEffect(() => {
    const unsubscribe = addScriptEventListener((type, data) => {
      if (type === 'say') {
        const { character, text, voiceLine } = data as {
          character: string;
          text: string;
          voiceLine?: string;
        };
        setDialogueState({
          type: 'say',
          character,
          text,
        });
        startTypewriter(text);
      } else if (type === 'narrate') {
        const { text } = data as { text: string };
        setDialogueState({
          type: 'narrate',
          text,
        });
        startTypewriter(text);
      } else if (type === 'thought') {
        const { text } = data as { text: string };
        setDialogueState({
          type: 'thought',
          text,
        });
        startTypewriter(text);
      }
    });

    return unsubscribe;
  }, []);

  const startTypewriter = (text: string) => {
    setDisplayedText('');
    setIsTyping(true);

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 1000 / textSpeed);

    // Store interval ID for cleanup
    return () => clearInterval(interval);
  };

  const handleClick = useCallback(() => {
    if (isTyping) {
      // Skip to end of text
      setDisplayedText(dialogueState.text);
      setIsTyping(false);
    } else if (dialogueState.type) {
      // Dismiss dialogue
      setDialogueState({ type: null, text: '' });
      signalDialogueDismissed();
    }
  }, [isTyping, dialogueState]);

  const handleChoiceClick = (choiceId: string) => {
    onChoiceSelect?.(choiceId);
    setDialogueState({ type: null, text: '' });
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClick]);

  if (!dialogueState.type) {
    return null;
  }

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
            <div className="absolute -top-3 left-4 px-3 py-1 bg-amber-700 rounded-md border border-amber-500 text-amber-200 text-sm font-bold uppercase tracking-wide">
              {dialogueState.character}
            </div>
          )}

          {/* Portrait */}
          {dialogueState.portrait && (
            <div className="absolute -left-20 bottom-0 w-24 h-32">
              <img
                src={dialogueState.portrait}
                alt={dialogueState.character}
                className="w-full h-full object-contain pixelated"
              />
            </div>
          )}

          {/* Dialogue text */}
          <div className={`text-lg leading-relaxed ${dialogueState.portrait ? 'ml-8' : ''}`}>
            {displayedText}
            {isTyping && <span className="animate-pulse">▌</span>}
          </div>

          {/* Click to continue indicator */}
          {!isTyping && !dialogueState.choices && (
            <div className="absolute bottom-2 right-4 text-amber-400/60 text-sm animate-pulse">
              Click to continue...
            </div>
          )}
        </div>

        {/* Choices */}
        {dialogueState.choices && dialogueState.choices.length > 0 && !isTyping && (
          <div className="mt-4 space-y-2">
            {dialogueState.choices.map((choice) => (
              <button
                key={choice.id}
                className="w-full p-3 text-left bg-slate-800/90 hover:bg-slate-700/90 border-2 border-slate-600 hover:border-amber-500 rounded-lg transition-all text-white hover:text-amber-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoiceClick(choice.id);
                }}
              >
                • {choice.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
