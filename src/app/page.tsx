'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PhaserGameRef } from '@/components/PhaserGame';
import InventoryBar from '@/components/InventoryBar';
import DialogueBox from '@/components/DialogueBox';
import HotspotLabel from '@/components/HotspotLabel';
import { GameScene } from '@/engine/GameScene';
import { ItemDefinition, RoomDefinition, Hotspot } from '@/types/game';
import { addScriptEventListener } from '@/engine/ScriptRunner';

// Dynamic import for Phaser (client-side only)
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-[960px] h-[600px] bg-slate-900 flex items-center justify-center">
      <div className="text-amber-400 text-xl animate-pulse">Loading...</div>
    </div>
  ),
});

// Sample room data for testing
const sampleRoom: RoomDefinition = {
  id: 'sinkhole',
  name: 'The Sinkhole',
  background: 'bg_sinkhole',
  music: 'music_sinkhole',
  walkableArea: {
    points: [
      { x: 100, y: 400 },
      { x: 860, y: 400 },
      { x: 900, y: 550 },
      { x: 60, y: 550 },
    ],
  },
  exits: [
    {
      id: 'to_general_store',
      targetRoom: 'general_store',
      targetPosition: { x: 150, y: 450 },
      polygon: {
        points: [
          { x: 0, y: 380 },
          { x: 50, y: 380 },
          { x: 50, y: 520 },
          { x: 0, y: 520 },
        ],
      },
      cursor: 'exit',
    },
  ],
  hotspots: [
    {
      id: 'sinkhole_entrance',
      name: 'The Sinkhole',
      polygon: {
        points: [
          { x: 350, y: 200 },
          { x: 600, y: 200 },
          { x: 650, y: 380 },
          { x: 300, y: 380 },
        ],
      },
      interactionPoint: { x: 480, y: 420 },
      cursor: 'look',
      lookScript: [
        { type: 'narrate', text: 'A gaping hole in the earth, the entrance to Marvel Cave. The Devil\'s Den, the Osage called it.' },
        { type: 'thought', text: 'There\'s something eerie about it. Like it\'s waiting for someone to fall in.' },
      ],
      useScript: [
        { type: 'thought', text: 'I\'m not climbing down there without proper equipment.' },
      ],
    },
    {
      id: 'rope_pulley',
      name: 'Old Rope and Pulley',
      polygon: {
        points: [
          { x: 420, y: 150 },
          { x: 480, y: 150 },
          { x: 480, y: 220 },
          { x: 420, y: 220 },
        ],
      },
      interactionPoint: { x: 450, y: 380 },
      cursor: 'use',
      lookScript: [
        { type: 'narrate', text: 'A weathered pulley system with frayed rope. The mining company used this to lower their ore carts.' },
      ],
      useScript: [
        {
          type: 'if',
          condition: 'hasItem("new_rope")',
          then: [
            { type: 'narrate', text: 'You replace the old frayed rope with the new one. The pulley system is now safe to use.' },
            { type: 'takeItem', itemId: 'new_rope' },
            { type: 'setFlag', flag: 'pulley_fixed', value: true },
            { type: 'puzzleSolved', puzzleId: 'fix_pulley' },
          ],
          else: [
            { type: 'thought', text: 'This rope is too frayed. I\'d need to replace it before using this.' },
          ],
        },
      ],
    },
    {
      id: 'v_marked_tree',
      name: 'V-Marked Tree',
      polygon: {
        points: [
          { x: 700, y: 100 },
          { x: 780, y: 100 },
          { x: 780, y: 350 },
          { x: 700, y: 350 },
        ],
      },
      interactionPoint: { x: 740, y: 420 },
      cursor: 'look',
      lookScript: [
        { type: 'narrate', text: 'An old oak tree with a deep V carved into its bark. The Osage left these as warnings.' },
        { type: 'thought', text: 'A warning to stay away from the sinkhole. Can\'t say I blame them.' },
      ],
    },
  ],
  characters: [],
  onEnter: [
    {
      type: 'if',
      condition: '!hasVisitedRoom("sinkhole")',
      then: [
        { type: 'narrate', text: 'October 30, 1889. Marmaros, Missouri.' },
        { type: 'narrate', text: 'You\'ve traveled a long way to see this hole in the ground. They\'re calling it Marvel Cave now.' },
        { type: 'thought', text: 'The mining company went bust. The town\'s half-burned. But there\'s something here worth finding.' },
      ],
    },
  ],
};

// Sample items
const sampleItems: ItemDefinition[] = [
  {
    id: 'lantern',
    name: 'Oil Lantern',
    description: 'A brass oil lantern, well-worn but functional.',
    icon: '/images/items/item_lantern.png',
    examineText: 'A reliable brass lantern. Essential for exploring dark caves.',
  },
  {
    id: 'journal',
    name: 'Uncle Cornelius\'s Journal',
    description: 'A leather-bound journal filled with cryptic notes.',
    icon: '/images/items/item_journal.png',
    examineText: 'The handwriting is barely legible. There are sketches of cave formations and strange symbols.',
  },
  {
    id: 'new_rope',
    name: 'New Hemp Rope',
    description: 'A coil of sturdy new rope.',
    icon: '/images/items/item_rope.png',
    examineText: 'Strong and reliable. Should hold a person\'s weight.',
  },
];

export default function GamePage() {
  const gameRef = useRef<PhaserGameRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  // Item definitions map
  const itemsMap = useRef(new Map<string, ItemDefinition>());

  useEffect(() => {
    // Populate items map
    for (const item of sampleItems) {
      itemsMap.current.set(item.id, item);
    }
  }, []);

  const handleSceneReady = useCallback((scene: GameScene) => {
    // Register room data
    scene.registerRoom(sampleRoom);

    // Register items
    for (const item of sampleItems) {
      scene.registerItem(item);
    }

    // Load initial room
    scene.loadRoom('sinkhole');

    setIsReady(true);

    // Subscribe to script events
    addScriptEventListener((type, data) => {
      if (type === 'itemAdded') {
        const { itemId } = data as { itemId: string };
        console.log('Item added:', itemId);
      } else if (type === 'puzzleSolved') {
        const { puzzleId } = data as { puzzleId: string };
        console.log('Puzzle solved:', puzzleId);
      }
    });
  }, []);

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
    const item = itemsMap.current.get(itemId);
    if (item) {
      // Show item description - could trigger a script
      console.log('Inspecting:', item.name, '-', item.examineText);
    }
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
      if (e.key === 'Escape' && !selectedItem) {
        setShowPauseMenu(!showPauseMenu);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPauseMenu, selectedItem]);

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

        {/* Dialogue box */}
        <DialogueBox />
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-amber-900 p-8 rounded-lg border-4 border-amber-600 shadow-2xl">
            <h2 className="text-2xl font-bold text-amber-200 mb-6 text-center">
              Paused
            </h2>
            <div className="space-y-3">
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors"
                onClick={() => setShowPauseMenu(false)}
              >
                Resume
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors"
                onClick={() => console.log('Save game')}
              >
                Save Game
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors"
                onClick={() => console.log('Load game')}
              >
                Load Game
              </button>
              <button
                className="w-full py-3 px-6 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors"
                onClick={() => console.log('Settings')}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="fixed bottom-4 left-4 text-amber-600/50 text-xs">
        Press Shift+D for debug mode
      </div>
    </main>
  );
}
