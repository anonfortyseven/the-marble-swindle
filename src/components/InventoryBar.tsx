'use client';

// Enhanced Inventory bar component with item inspection and combination
// The Marble Swindle - UI Component

import { useState, useEffect, useCallback, useRef } from 'react';
import { getInventory, subscribeToStateChanges, hasItem, removeItem, addItem, notifyStateChange } from '@/engine/GameState';
import { addScriptEventListener } from '@/engine/ScriptRunner';
import { ItemDefinition, ScriptCommand } from '@/types/game';
import { runScriptWithContext } from '@/engine/ScriptRunner';

interface InventoryBarProps {
  items: Map<string, ItemDefinition>;
  onItemSelect: (itemId: string) => void;
  onItemInspect: (itemId: string) => void;
  selectedItem: string | null;
}

export default function InventoryBar({
  items,
  onItemSelect,
  onItemInspect,
  selectedItem,
}: InventoryBarProps) {
  const [inventory, setInventory] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [combineMode, setCombineMode] = useState(false);
  const [combineSourceItem, setCombineSourceItem] = useState<string | null>(null);
  const [newItemFlash, setNewItemFlash] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<ItemDefinition | null>(null);

  const MAX_VISIBLE = 8;
  const SLOT_WIDTH = 72;

  useEffect(() => {
    // Initial inventory
    setInventory(getInventory());

    // Subscribe to state changes
    const unsubscribe = subscribeToStateChanges((state) => {
      setInventory([...state.inventory]);
    });

    return unsubscribe;
  }, []);

  // Listen for item additions to show flash effect
  useEffect(() => {
    const unsubscribe = addScriptEventListener((type, data) => {
      if (type === 'itemAdded') {
        const { itemId } = data as { itemId: string };
        setNewItemFlash(itemId);
        // Clear flash after animation
        setTimeout(() => setNewItemFlash(null), 1500);
        // Scroll to show new item
        const newIndex = getInventory().indexOf(itemId);
        if (newIndex >= scrollOffset + MAX_VISIBLE) {
          setScrollOffset(Math.max(0, newIndex - MAX_VISIBLE + 1));
        }
      }
    });

    return unsubscribe;
  }, [scrollOffset]);

  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = scrollOffset < inventory.length - MAX_VISIBLE;

  const visibleItems = inventory.slice(
    scrollOffset,
    scrollOffset + MAX_VISIBLE
  );

  const handleItemClick = useCallback((itemId: string, e: React.MouseEvent) => {
    if (e.button === 2) {
      // Right click to inspect
      e.preventDefault();
      const item = items.get(itemId);
      if (item) {
        setInspectedItem(item);
      }
      return;
    }

    // Handle combine mode
    if (combineMode && combineSourceItem) {
      handleCombineItems(combineSourceItem, itemId);
      return;
    }

    // Left click to select for use
    onItemSelect(itemId);
  }, [combineMode, combineSourceItem, items, onItemSelect]);

  const handleCombineItems = useCallback(async (sourceId: string, targetId: string) => {
    // Exit combine mode
    setCombineMode(false);
    setCombineSourceItem(null);

    if (sourceId === targetId) {
      // Can't combine with itself
      return;
    }

    const sourceItem = items.get(sourceId);
    const targetItem = items.get(targetId);

    if (!sourceItem || !targetItem) return;

    // Check if combination is valid
    const canCombine = sourceItem.canCombineWith?.includes(targetId) || 
                       targetItem.canCombineWith?.includes(sourceId);

    if (!canCombine) {
      // Show "can't combine" message
      await runScriptWithContext([
        { type: 'thought', text: `I can't combine the ${sourceItem.name} with the ${targetItem.name}.` }
      ]);
      return;
    }

    // Determine result
    let resultId: string | undefined;
    let combineScript: ScriptCommand[] | undefined;

    if (sourceItem.combineResult?.[targetId]) {
      resultId = sourceItem.combineResult[targetId];
      combineScript = sourceItem.combineScript?.[targetId];
    } else if (targetItem.combineResult?.[sourceId]) {
      resultId = targetItem.combineResult[sourceId];
      combineScript = targetItem.combineScript?.[sourceId];
    }

    // Execute combination
    if (combineScript) {
      await runScriptWithContext(combineScript);
    } else if (resultId) {
      // Default combination: remove both, add result
      removeItem(sourceId);
      removeItem(targetId);
      addItem(resultId);
      notifyStateChange();
      
      const resultItem = items.get(resultId);
      await runScriptWithContext([
        { type: 'thought', text: `I combined the ${sourceItem.name} with the ${targetItem.name} to make a ${resultItem?.name || 'something new'}.` }
      ]);
    }
  }, [items]);

  const startCombineMode = useCallback((itemId: string) => {
    const item = items.get(itemId);
    if (item?.canCombineWith && item.canCombineWith.length > 0) {
      setCombineMode(true);
      setCombineSourceItem(itemId);
      setInspectedItem(null);
    }
  }, [items]);

  const cancelCombineMode = useCallback(() => {
    setCombineMode(false);
    setCombineSourceItem(null);
  }, []);

  const getItemData = (itemId: string): ItemDefinition | undefined => {
    return items.get(itemId);
  };

  const closeInspection = useCallback(() => {
    setInspectedItem(null);
  }, []);

  // ESC to cancel combine mode or close inspection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectedItem) {
          closeInspection();
        } else if (combineMode) {
          cancelCombineMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [combineMode, inspectedItem, cancelCombineMode, closeInspection]);

  return (
    <>
      {/* Combine mode banner */}
      {combineMode && combineSourceItem && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="px-6 py-3 bg-emerald-900/95 border-2 border-emerald-500 rounded-lg shadow-lg animate-pulse">
            <p className="text-emerald-200 text-center">
              Select item to combine with{' '}
              <span className="font-bold text-emerald-400">
                {items.get(combineSourceItem)?.name}
              </span>
            </p>
            <p className="text-emerald-400/60 text-sm text-center mt-1">
              Press ESC to cancel
            </p>
          </div>
        </div>
      )}

      {/* Item inspection modal */}
      {inspectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={closeInspection}
        >
          <div
            className="bg-gradient-to-b from-amber-900 to-amber-950 p-6 rounded-xl border-4 border-amber-600 shadow-2xl max-w-lg w-full mx-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Item header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-24 h-24 bg-amber-800 rounded-lg border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                <img
                  src={inspectedItem.icon}
                  alt={inspectedItem.name}
                  className="w-20 h-20 object-contain pixelated"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-amber-200 mb-2">
                  {inspectedItem.name}
                </h2>
                <p className="text-amber-400/80 text-sm">
                  {inspectedItem.description}
                </p>
              </div>
            </div>

            {/* Examine text */}
            <div className="bg-amber-950/50 rounded-lg p-4 mb-4 border border-amber-700/50">
              <p className="text-amber-100 italic leading-relaxed">
                "{inspectedItem.examineText}"
              </p>
            </div>

            {/* Combinable hint */}
            {inspectedItem.canCombineWith && inspectedItem.canCombineWith.length > 0 && (
              <div className="text-amber-500/70 text-sm mb-4 flex items-center gap-2">
                <span className="text-lg">✧</span>
                <span>This item can be combined with other items.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {inspectedItem.canCombineWith && inspectedItem.canCombineWith.length > 0 && (
                <button
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 rounded-lg transition-colors border border-emerald-500"
                  onClick={() => startCombineMode(inspectedItem.id)}
                >
                  Combine...
                </button>
              )}
              <button
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors border border-amber-500"
                onClick={() => {
                  onItemSelect(inspectedItem.id);
                  closeInspection();
                }}
              >
                Use
              </button>
              <button
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors border border-slate-500"
                onClick={closeInspection}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory bar */}
      <div className="inventory-bar relative h-20 bg-gradient-to-t from-amber-900 to-amber-800 border-t-4 border-amber-600 shadow-lg rounded-lg">
        {/* Left scroll button */}
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-amber-200 font-bold z-10"
          onClick={() => setScrollOffset(Math.max(0, scrollOffset - 1))}
          disabled={!canScrollLeft}
        >
          ◀
        </button>

        {/* Inventory slots */}
        <div className="flex justify-center items-center h-full gap-2 px-12">
          {Array.from({ length: MAX_VISIBLE }).map((_, index) => {
            const itemId = visibleItems[index];
            const item = itemId ? getItemData(itemId) : null;
            const isSelected = itemId === selectedItem;
            const isHovered = itemId === hoveredItem;
            const isFlashing = itemId === newItemFlash;
            const isCombineSource = itemId === combineSourceItem;
            const canCombineWithSource = combineMode && combineSourceItem && itemId &&
              (items.get(combineSourceItem)?.canCombineWith?.includes(itemId) ||
               items.get(itemId)?.canCombineWith?.includes(combineSourceItem));

            return (
              <div
                key={index}
                className={`
                  w-16 h-16 rounded-lg border-2 relative
                  ${itemId ? 'cursor-pointer' : 'cursor-default'}
                  ${isCombineSource
                    ? 'border-emerald-400 bg-emerald-600 shadow-lg shadow-emerald-500/50'
                    : canCombineWithSource
                      ? 'border-emerald-400 bg-emerald-700/50 animate-pulse'
                      : isSelected 
                        ? 'border-yellow-400 bg-amber-600 shadow-lg shadow-yellow-500/50' 
                        : isHovered
                          ? 'border-amber-400 bg-amber-700'
                          : 'border-amber-500 bg-amber-800'
                  }
                  ${isFlashing ? 'animate-bounce ring-4 ring-yellow-400' : ''}
                  transition-all duration-150 ease-out
                  flex items-center justify-center
                `}
                onClick={(e) => itemId && handleItemClick(itemId, e)}
                onContextMenu={(e) => itemId && handleItemClick(itemId, e)}
                onMouseEnter={() => itemId && setHoveredItem(itemId)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {item ? (
                  <img
                    src={item.icon}
                    alt={item.name}
                    className={`w-12 h-12 object-contain pixelated ${isSelected ? 'animate-pulse' : ''}`}
                    draggable={false}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 opacity-20 border border-dashed border-amber-600 rounded" />
                )}
                
                {/* Combine indicator */}
                {canCombineWithSource && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-white">
                    +
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right scroll button */}
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-amber-200 font-bold z-10"
          onClick={() => setScrollOffset(scrollOffset + 1)}
          disabled={!canScrollRight}
        >
          ▶
        </button>

        {/* Tooltip */}
        {hoveredItem && !combineMode && !inspectedItem && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/90 text-amber-200 rounded-lg shadow-lg text-sm whitespace-nowrap pointer-events-none">
            {getItemData(hoveredItem)?.name || hoveredItem}
            <span className="text-amber-400/60 ml-2">(Right-click to examine)</span>
          </div>
        )}

        {/* Item count */}
        <div className="absolute bottom-1 right-12 text-amber-400/50 text-xs">
          {inventory.length} item{inventory.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  );
}
