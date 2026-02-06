'use client';

import { useState, useEffect } from 'react';
import { getInventory, subscribeToStateChanges } from '@/engine/GameState';
import { ItemDefinition } from '@/types/game';

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

  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = scrollOffset < inventory.length - MAX_VISIBLE;

  const visibleItems = inventory.slice(
    scrollOffset,
    scrollOffset + MAX_VISIBLE
  );

  const handleItemClick = (itemId: string, e: React.MouseEvent) => {
    if (e.button === 2) {
      // Right click to inspect
      e.preventDefault();
      onItemInspect(itemId);
    } else {
      // Left click to select/use
      onItemSelect(itemId);
    }
  };

  const getItemData = (itemId: string): ItemDefinition | undefined => {
    return items.get(itemId);
  };

  return (
    <div className="inventory-bar fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-amber-900 to-amber-800 border-t-4 border-amber-600 shadow-lg">
      {/* Left scroll button */}
      <button
        className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-amber-200 font-bold`}
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

          return (
            <div
              key={index}
              className={`
                w-16 h-16 rounded-lg border-2 
                ${itemId ? 'cursor-pointer' : 'cursor-default'}
                ${isSelected 
                  ? 'border-yellow-400 bg-amber-600 shadow-lg shadow-yellow-500/50' 
                  : isHovered
                    ? 'border-amber-400 bg-amber-700'
                    : 'border-amber-500 bg-amber-800'
                }
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
                />
              ) : (
                <div className="w-12 h-12 opacity-20 border border-dashed border-amber-600 rounded" />
              )}
            </div>
          );
        })}
      </div>

      {/* Right scroll button */}
      <button
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-amber-200 font-bold`}
        onClick={() => setScrollOffset(scrollOffset + 1)}
        disabled={!canScrollRight}
      >
        ▶
      </button>

      {/* Tooltip */}
      {hoveredItem && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/90 text-amber-200 rounded-lg shadow-lg text-sm whitespace-nowrap pointer-events-none">
          {getItemData(hoveredItem)?.name || hoveredItem}
        </div>
      )}
    </div>
  );
}
