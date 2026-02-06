'use client';

// Main game page with integrated systems
// The Marble Swindle - Next.js App

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PhaserGameRef } from '@/components/PhaserGame';
import InventoryBar from '@/components/InventoryBar';
import DialogueBox from '@/components/DialogueBox';
import HotspotLabel from '@/components/HotspotLabel';
import SaveLoadMenu from '@/components/SaveLoadMenu';
import { GameScene } from '@/engine/GameScene';
import { ItemDefinition, RoomDefinition, Hotspot } from '@/types/game';
import { addScriptEventListener } from '@/engine/ScriptRunner';
import { loadDialogueFromJSON } from '@/engine/DialogueLoader';
import { useAutoSave } from '@/hooks/useGameState';

// Import JSON data
import itemsData from '@/data/items/items.json';
import sinkholeRoom from '@/data/rooms/sinkhole.json';
import generalStoreRoom from '@/data/rooms/general_store.json';
import maybelleDialogueData from '@/data/dialogue/maybelle.json';
import lynchDialogueData from '@/data/dialogue/lynch.json';

// Type assertion helpers for JSON imports
import type { DialogueFile } from '@/types/dialogue';

// Dynamic import for Phaser (client-side only)
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-[960px] h-[600px] bg-slate-900 flex items-center justify-center">
      <div className="text-amber-400 text-xl animate-pulse">Loading...</div>
    </div>
  ),
});

export default function GamePage() {
  const gameRef = useRef<PhaserGameRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Item definitions map
  const itemsMap = useRef(new Map<string, ItemDefinition>());

  // Character portraits map
  const portraitsMap = useRef(new Map<string, string>());

  // Enable auto-save every 5 minutes
  useAutoSave(isReady, 5);

  // Initialize items and dialogues
  useEffect(() => {
    // Populate items map from JSON
    for (const item of itemsData.items as ItemDefinition[]) {
      itemsMap.current.set(item.id, item);
    }

    // Load dialogue files (cast to unknown first to avoid strict type checking on JSON)
    loadDialogueFromJSON(maybelleDialogueData as unknown as DialogueFile);
    loadDialogueFromJSON(lynchDialogueData as unknown as DialogueFile);

    // Set up character portraits
    portraitsMap.current.set('Maybelle', '/images/portraits/maybelle_neutral.png');
    portraitsMap.current.set('Lynch', '/images/portraits/lynch_neutral.png');
    portraitsMap.current.set('Clem', '/images/portraits/clem_neutral.png');
  }, []);

  const handleSceneReady = useCallback((scene: GameScene) => {
    // Register rooms
    scene.registerRoom(sinkholeRoom as unknown as RoomDefinition);
    scene.registerRoom(generalStoreRoom as unknown as RoomDefinition);

    // Register items
    for (const item of itemsData.items as ItemDefinition[]) {
      scene.registerItem(item);
    }

    // Load initial room
    scene.loadRoom('sinkhole');

    setIsReady(true);

    // Subscribe to script events for notifications
    addScriptEventListener((type, data) => {
      if (type === 'itemAdded') {
        const { itemId } = data as { itemId: string };
        const item = itemsMap.current.get(itemId);
        if (item) {
          showNotification(`Acquired: ${item.name}`);
        }
      } else if (type === 'puzzleSolved') {
        const { puzzleId } = data as { puzzleId: string };
        showNotification('Puzzle solved!');
      }
    });
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleItemSelect = (itemId: string) => {
    if (selectedItem === itemId) {
      // Deselect if clicking same item
      setSelectedItem(null);
      gameRef.current?.clearSelectedItem();
    } else {
      setSelectedItem(itemId);
      gameRef.current?.selectItem(itemId);
    }
  };

  const handleItemInspect = (itemId: string) => {
    // Handled by InventoryBar component now
  };

  // Track mouse position for hotspot labels
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Poll for hovered hotspot from game scene
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const scene = gameRef.current?.scene;
      if (scene) {
        setHoveredHotspot(scene.getHoveredHotspot());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isReady]);

  // ESC key to open pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSaveMenu || showLoadMenu || showSettings) {
          setShowSaveMenu(false);
          setShowLoadMenu(false);
          setShowSettings(false);
        } else if (!selectedItem) {
          setShowPauseMenu(!showPauseMenu);
        } else {
          setSelectedItem(null);
          gameRef.current?.clearSelectedItem();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPauseMenu, selectedItem, showSaveMenu, showLoadMenu, showSettings]);

  // Close menus when clicking outside
  const handleOverlayClick = useCallback(() => {
    setShowPauseMenu(false);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Title */}
      <h1 className="text-3xl font-bold text-amber-500 mb-4 font-serif tracking-wide">
        The Marble Swindle
      </h1>

      {/* Game container */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-amber-800">
        <PhaserGame
          ref={gameRef}
          width={960}
          height={600}
          onSceneReady={handleSceneReady}
        />

        {/* Hotspot label */}
        <HotspotLabel
          hotspot={hoveredHotspot}
          mousePosition={mousePosition}
        />

        {/* Dialogue box with portraits */}
        <DialogueBox portraits={portraitsMap.current} />

        {/* Notification toast */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-amber-900/95 border-2 border-amber-500 rounded-lg shadow-lg animate-in slide-in-from-top duration-300">
            <p className="text-amber-200 font-semibold">{notification}</p>
          </div>
        )}
      </div>

      {/* Inventory bar */}
      <div className="w-[960px] mt-4">
        <InventoryBar
          items={itemsMap.current}
          selectedItem={selectedItem}
          onItemSelect={handleItemSelect}
          onItemInspect={handleItemInspect}
        />
      </div>

      {/* Pause menu overlay */}
      {showPauseMenu && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-40"
          onClick={handleOverlayClick}
        >
          <div
            className="bg-gradient-to-b from-amber-900 to-amber-950 p-8 rounded-xl border-4 border-amber-600 shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-amber-200 mb-6 text-center font-serif">
              ⚜ Paused ⚜
            </h2>
            <div className="space-y-3 min-w-[200px]">
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 font-semibold"
                onClick={() => setShowPauseMenu(false)}
              >
                Resume
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 font-semibold"
                onClick={() => {
                  setShowPauseMenu(false);
                  setShowSaveMenu(true);
                }}
              >
                Save Game
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 font-semibold"
                onClick={() => {
                  setShowPauseMenu(false);
                  setShowLoadMenu(true);
                }}
              >
                Load Game
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500 font-semibold"
                onClick={() => {
                  setShowPauseMenu(false);
                  setShowSettings(true);
                }}
              >
                Settings
              </button>
              <div className="pt-2 border-t border-amber-700/50">
                <button
                  className="w-full py-2 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-500 text-sm"
                  onClick={() => {
                    // Could add a "quit to title" action here
                    window.location.reload();
                  }}
                >
                  Quit to Title
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save menu */}
      {showSaveMenu && (
        <SaveLoadMenu
          mode="save"
          onClose={() => setShowSaveMenu(false)}
          onAction={(slot, success) => {
            if (success) {
              showNotification('Game saved!');
            }
          }}
        />
      )}

      {/* Load menu */}
      {showLoadMenu && (
        <SaveLoadMenu
          mode="load"
          onClose={() => setShowLoadMenu(false)}
          onAction={(slot, success) => {
            if (success) {
              showNotification('Game loaded!');
              // Refresh the scene
              const currentRoom = gameRef.current?.scene?.getCurrentRoomData()?.id;
              if (currentRoom) {
                gameRef.current?.scene?.loadRoom(currentRoom);
              }
            }
          }}
        />
      )}

      {/* Settings menu */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-gradient-to-b from-amber-900 to-amber-950 p-6 rounded-xl border-4 border-amber-600 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-amber-200 mb-6 text-center">
              Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-amber-400/80 text-sm mb-2">
                  Music Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="50"
                  className="w-full accent-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-amber-400/80 text-sm mb-2">
                  Sound Effects Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="70"
                  className="w-full accent-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-amber-400/80 text-sm mb-2">
                  Text Speed
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  defaultValue="35"
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-amber-400/80">Enable Voice</label>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 accent-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-amber-700/50">
              <button
                className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="fixed bottom-4 left-4 text-amber-600/50 text-xs space-y-1">
        <div>Press Shift+D for debug mode</div>
        <div>Press ESC for menu</div>
      </div>
    </main>
  );
}
